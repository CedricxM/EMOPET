using System;
using System.Threading;
using System.Threading.Tasks;
using NUnit.Framework;

namespace Emopet.World.Tests
{
    public sealed class WorldBackendClientTests
    {
        private const string Handle = "11111111-1111-4111-8111-111111111111";

        [Test]
        public async Task BootstrapUsesCanonicalBackendMountAndBearerToken()
        {
            var http = new FakeHttp(200,
                "{\"handle\":\"11111111-1111-4111-8111-111111111111\",\"expiresAt\":123,\"state\":\"connected\"}");
            var client = new WorldBackendClient("http://127.0.0.1:3000", new FakeToken(), http);

            var result = await client.BootstrapAsync(null, CancellationToken.None);

            Assert.That(http.LastUrl, Is.EqualTo("http://127.0.0.1:3000/api/world-spike/bootstrap"));
            Assert.That(http.LastBearer, Is.EqualTo("test-token"));
            Assert.That(result.handle, Is.EqualTo(Handle));
        }

        [Test]
        public void InvalidPresetFailsBeforeNetwork()
        {
            var http = new FakeHttp(200, "{}");
            var client = new WorldBackendClient("http://127.0.0.1:3000", new FakeToken(), http);

            Assert.ThrowsAsync<ArgumentException>(() =>
                client.SendPresetAsync(Handle, Handle, "hello-from-free-text", CancellationToken.None));

            Assert.That(http.Calls, Is.EqualTo(0));
        }

        [Test]
        public async Task IncomingFreeTextIsNotPartOfFirstSliceDto()
        {
            var http = new FakeHttp(200,
                "{\"state\":\"connected\",\"resyncRequired\":false,\"events\":[{\"type\":\"chat\",\"value\":{\"senderId\":\"22222222-2222-4222-8222-222222222222\",\"messageId\":\"33333333-3333-4333-8333-333333333333\",\"content\":{\"preset\":\"merci\",\"text\":\"must-not-deserialize\"}}}]}");
            var client = new WorldBackendClient("http://127.0.0.1:3000", new FakeToken(), http);

            var result = await client.GetEventsAsync(Handle, CancellationToken.None);

            Assert.That(result.events, Has.Length.EqualTo(1));
            Assert.That(result.events[0].value.content.preset, Is.EqualTo("merci"));
            Assert.That(typeof(WorldEventContentDto).GetField("text"), Is.Null);
        }

        [Test]
        public void NoHttpResponseMapsToUnavailableWithoutLeakingTransportDetail()
        {
            var http = new FakeHttp(0, string.Empty);
            var client = new WorldBackendClient("http://127.0.0.1:3000", new FakeToken(), http);

            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                client.FriendsListAsync(Handle, CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(error.StatusCode, Is.EqualTo(0));
        }

        [Test]
        public void UnreachableMapsBlockedAndOfflineToSameClientError()
        {
            var http = new FakeHttp(404, "{\"error\":\"unreachable\",\"state\":\"rejected\"}");
            var client = new WorldBackendClient("http://127.0.0.1:3000", new FakeToken(), http);

            var error = Assert.ThrowsAsync<WorldBackendException>(() =>
                client.FriendsListAsync(Handle, CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unreachable));
        }

        private sealed class FakeToken : IWorldAccessTokenProvider
        {
            public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
                Task.FromResult("test-token");
        }

        private sealed class FakeHttp : IWorldHttpTransport
        {
            private readonly WorldHttpResponse response;

            public FakeHttp(long status, string body) => response = new WorldHttpResponse(status, body);

            public int Calls { get; private set; }
            public string LastUrl { get; private set; }
            public string LastBearer { get; private set; }

            public Task<WorldHttpResponse> SendAsync(
                string method,
                string absoluteUrl,
                string bearerToken,
                string jsonBody,
                CancellationToken cancellationToken)
            {
                Calls++;
                LastUrl = absoluteUrl;
                LastBearer = bearerToken;
                return Task.FromResult(response);
            }
        }
    }
}
