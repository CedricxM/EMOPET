using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NUnit.Framework;

namespace Emopet.World.Tests
{
    public sealed class WorldSessionCoordinatorTests
    {
        private const string Handle = "11111111-1111-4111-8111-111111111111";
        private const string FreshHandle = "55555555-5555-4555-8555-555555555555";
        private const long FutureExpiry = 4102444800000;

        [Test]
        public void ExpiredBootstrapFailsClosedBeforeConnectedState()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200,
                    "{\"handle\":\"" + Handle + "\",\"expiresAt\":1,\"state\":\"connected\"}"));
            var coordinator = Create(http);

            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.ConnectAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.InvalidSession));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Revoked));
            Assert.That(coordinator.Handle, Is.Null);
        }

        [Test]
        public async Task ValidPresetAndPresenceEventsRemainAccepted()
        {
            var body =
                "{\"state\":\"connected\",\"resyncRequired\":false,\"events\":[" +
                "{\"type\":\"chat\",\"value\":{\"channelId\":\"33333333-3333-4333-8333-333333333333\",\"senderId\":\"22222222-2222-4222-8222-222222222222\",\"messageId\":\"44444444-4444-4444-8444-444444444444\",\"content\":{\"preset\":\"merci\"},\"joins\":[],\"leaves\":[]}}," +
                "{\"type\":\"presence\",\"value\":{\"joins\":[{\"user_id\":\"22222222-2222-4222-8222-222222222222\",\"status\":\"online\"}],\"leaves\":[]}}" +
                "]}";
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(200, body));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var result = await coordinator.PollEventsAsync(CancellationToken.None);

            Assert.That(result.events, Has.Length.EqualTo(2));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.ConnectedInvisible));
        }

        [Test]
        public async Task UnknownOrMalformedDeliveredEventFailsClosed()
        {
            var body =
                "{\"state\":\"connected\",\"resyncRequired\":false,\"events\":[" +
                "{\"type\":\"chat\",\"value\":{\"channelId\":\"33333333-3333-4333-8333-333333333333\",\"senderId\":\"22222222-2222-4222-8222-222222222222\",\"messageId\":\"44444444-4444-4444-8444-444444444444\",\"content\":{\"preset\":\"not-approved\"},\"joins\":[],\"leaves\":[]}}" +
                "]}";
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(200, body));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.PollEventsAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
        }

        [Test]
        public void CancelledBootstrapLeavesRecoverableDegradedState()
        {
            var coordinator = Create(new CancelledHttp());
            using var cancellation = new CancellationTokenSource();
            cancellation.Cancel();

            Assert.ThrowsAsync<OperationCanceledException>(() =>
                coordinator.ConnectAsync(cancellation.Token));

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
            Assert.That(coordinator.Handle, Is.Null);
        }

        [Test]
        public async Task StaleRenewalHandleFallsBackToFreshInvisibleBootstrap()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(0, string.Empty),
                new WorldHttpResponse(401, "{\"error\":\"invalid_session\"}"),
                new WorldHttpResponse(200, BootstrapJson(FreshHandle)));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.PollEventsAsync(CancellationToken.None));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));

            await coordinator.ConnectAsync(CancellationToken.None);

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.ConnectedInvisible));
            Assert.That(coordinator.Handle, Is.EqualTo(FreshHandle));
            Assert.That(http.Bodies[2], Does.Contain(Handle), "renewal first carries the stale handle");
            Assert.That(http.Bodies[3], Is.EqualTo("{}"), "fallback is one fresh bootstrap without replay state");
        }

        [Test]
        public async Task MalformedSuccessfulEventsResponseFailsClosed()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(200, "{\"state\":\"connected\"}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.PollEventsAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
        }

        [Test]
        public async Task MalformedSuccessfulPresenceResponseFailsClosed()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(200, "{\"presence\":\"visible\",\"until\":0}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.ShowPresenceAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
            Assert.That(coordinator.Handle, Is.EqualTo(Handle));
        }

        [Test]
        public async Task NoHttpResponseMovesConnectedSessionToDegraded()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(0, string.Empty));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.PollEventsAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
        }

        [Test]
        public async Task AuthMiddleware401RevokesConnectedSession()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(401, "{\"error\":\"Invalid or expired token\"}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.PollEventsAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.InvalidSession));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Revoked));
            Assert.That(coordinator.Handle, Is.Null);
            Assert.That(coordinator.ExpiresAtUnixMs, Is.EqualTo(0));
        }

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
        public async Task CancelledShowPresenceMovesSessionToDegradedUncertainty()
        {
            var coordinator = Create(new CancelAfterFirstHttp());

            await coordinator.ConnectAsync(CancellationToken.None);
            Assert.ThrowsAsync<OperationCanceledException>(() =>
                coordinator.ShowPresenceAsync(CancellationToken.None));

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
            Assert.That(coordinator.Handle, Is.EqualTo(Handle));
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
        public async Task HidePresenceNoResponseKeepsUncertainHandleAndDegrades()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(200, "{\"presence\":\"visible\",\"until\":123}"),
                new WorldHttpResponse(0, string.Empty));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            await coordinator.ShowPresenceAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.HidePresenceAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
            Assert.That(coordinator.Handle, Is.EqualTo(Handle));
            Assert.That(coordinator.ExpiresAtUnixMs, Is.EqualTo(FutureExpiry));
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
        public async Task ConfirmedDisconnectClosesLocalState()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(204, string.Empty));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            await coordinator.DisconnectAsync(CancellationToken.None);

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Disconnected));
            Assert.That(coordinator.Handle, Is.Null);
        }

        [Test]
        public async Task UncertainDisconnectKeepsHandleAndDegrades()
        {
            var http = new QueueHttp(
                new WorldHttpResponse(200, BootstrapJson()),
                new WorldHttpResponse(503, "{\"error\":\"unavailable\",\"state\":\"degraded\"}"));
            var coordinator = Create(http);

            await coordinator.ConnectAsync(CancellationToken.None);
            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                coordinator.DisconnectAsync(CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
            Assert.That(coordinator.Handle, Is.EqualTo(Handle));
        }

        [Test]
        public async Task CancelledDisconnectKeepsHandleAndDegrades()
        {
            var coordinator = Create(new CancelAfterFirstHttp());

            await coordinator.ConnectAsync(CancellationToken.None);
            Assert.ThrowsAsync<OperationCanceledException>(() =>
                coordinator.DisconnectAsync(CancellationToken.None));

            Assert.That(coordinator.State, Is.EqualTo(WorldSessionState.Degraded));
            Assert.That(coordinator.Handle, Is.EqualTo(Handle));
        }

        private static WorldSessionCoordinator Create(IWorldHttpTransport http) =>
            new WorldSessionCoordinator(new WorldBackendClient(
                "http://127.0.0.1:3000",
                new FakeToken(),
                http));

        private static string BootstrapJson(string handle = Handle) =>
            "{\"handle\":\"" + handle + "\",\"expiresAt\":" + FutureExpiry + ",\"state\":\"connected\"}";

        private sealed class FakeToken : IWorldAccessTokenProvider
        {
            public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
                Task.FromResult("test-token");
        }

        private sealed class CancelledHttp : IWorldHttpTransport
        {
            public Task<WorldHttpResponse> SendAsync(
                string method,
                string absoluteUrl,
                string bearerToken,
                string jsonBody,
                CancellationToken cancellationToken)
            {
                cancellationToken.ThrowIfCancellationRequested();
                throw new OperationCanceledException(cancellationToken);
            }
        }

        private sealed class CancelAfterFirstHttp : IWorldHttpTransport
        {
            private int calls;

            public Task<WorldHttpResponse> SendAsync(
                string method,
                string absoluteUrl,
                string bearerToken,
                string jsonBody,
                CancellationToken cancellationToken)
            {
                calls++;
                if (calls == 1)
                    return Task.FromResult(new WorldHttpResponse(200, BootstrapJson()));

                throw new OperationCanceledException(cancellationToken);
            }
        }

        private sealed class QueueHttp : IWorldHttpTransport
        {
            private readonly Queue<WorldHttpResponse> responses;

            public QueueHttp(params WorldHttpResponse[] responses) =>
                this.responses = new Queue<WorldHttpResponse>(responses);

            public List<string> Bodies { get; } = new List<string>();

            public Task<WorldHttpResponse> SendAsync(
                string method,
                string absoluteUrl,
                string bearerToken,
                string jsonBody,
                CancellationToken cancellationToken)
            {
                Bodies.Add(jsonBody);
                return Task.FromResult(responses.Dequeue());
            }
        }
    }
}
