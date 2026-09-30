using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NUnit.Framework;

namespace Emopet.World.Tests
{
    public sealed class WorldSessionCoordinatorTests
    {
        private const string Handle = "11111111-1111-4111-8111-111111111111";

        [Test]
        public async Task EventsUnavailableMovesConnectedSessionToDegraded()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(503, "{\"error\":\"unavailable\",\"state\":\"degraded\"}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.PollEventsAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
        }

        [Test]
        public async Task ForbiddenPresenceRevokesLocalHandle()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(403, "{\"error\":\"forbidden\",\"state\":\"rejected\"}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.ShowPresenceAsync(CancellationToken.None));

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Revoked));
            Assert.That(coordinator.Handle, Is.Null);
        }

        [Test]
        public async Task HidePresenceClosesSessionAndClearsHandle()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(200, "{\"presence\":\"visible\",\"until\":123}"),
                new WorldHttpResponse(204, string.Empty));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            await coordinator.ShowPresenceAsync(CancellationToken.None);
            await coordinator.HidePresenceAsync(CancellationToken.None);

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Disconnected));
            Assert.That(coordinator.Handle, Is.Null);
            Assert.That(coordinator.ExpiresAtUnixMs, Is.EqualTo(0));
        }

        [Test]
        public async Task HidePresenceFailureStillClearsDeadServerHandle()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(200, "{\"presence\":\"visible\",\"until\":123}"),
                new WorldHttpResponse(503, "{\"error\":\"unavailable\",\"state\":\"degraded\"}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            await coordinator.ShowPresenceAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.HidePresenceAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Disconnected));
            Assert.That(coordinator.Handle, Is.Null);
            Assert.That(coordinator.ExpiresAtUnixMs, Is.EqualTo(0));
        }

        [Test]
        public async Task DisconnectClosesLocalStateEvenWhenBackendIsUnavailable()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(503, "{\"error\":\"unavailable\",\"state\":\"degraded\"}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            await coordinator.DisconnectAsync(CancellationToken.None);

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Disconnected));
            Assert.That(coordinator.Handle, Is.Null);
        }

        private static WorldSessionCoordinator Create(IWorldHttpTransport http) =>
            new WorldSessionCoordinator(new WorldBackendClient(
                "http://127.0.0.1:3000",
                new FakeToken(),
                http));

        private static string BootstrapJson() =>
            "{\"handle\":\"" + Handle + "\",\"expiresAt\":123,\"state\":\"connected\"}";

        private sealed class FakeToken : IWorldAccessTokenProvider
        {
            public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
                Task.FromResult("test-token");
        }

        private sealed class QueueHttp : IWorldHttpTransport
        {
            private readonly Queue<WorldHttpResponse> responses;

            public QueueHttp(params WorldHttpResponse[] responses) =>
                this.responses = new Queue<WorldHttpResponse>(responses);

            public Task<WorldHttpResponse> SendAsync(
                string method,
                string absoluteUrl,
                string bearerToken,
                string jsonBody,
                CancellationToken cancellationToken) =>
                Task.FromResult(responses.Dequeue());
        }
    }
}
