using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NUnit.Framework;

namespace Emopet.World.Tests
{
    public sealed class WorldGamificationReadClientTests
    {
        private static readonly string Token = new string('x', 24);

        [Test]
        public async Task ReadUsesBearerGetAndCoarseRegionWithoutOwnerInput()
        {
            var http = new FakeHttp(200, ValidSnapshot());
            var client = new WorldGamificationReadClient(
                "https://api.example.test/",
                new StaticToken(Token),
                http);

            var result = await client.ReadAsync("fr-bre", CancellationToken.None);

            Assert.That(http.Calls, Is.EqualTo(1));
            Assert.That(http.LastMethod, Is.EqualTo("GET"));
            Assert.That(http.LastBearer, Is.EqualTo(Token));
            Assert.That(http.LastBody, Is.Null);
            Assert.That(
                http.LastUrl,
                Is.EqualTo("https://api.example.test/api/world-gamification?region=FR-BRE"));
            Assert.That(http.LastUrl, Does.Not.Contain("owner"));
            Assert.That(result.authority, Is.EqualTo(WorldGamificationReadClient.Authority));
            Assert.That(result.region.code, Is.EqualTo("FR-BRE"));
            Assert.That(result.resources.communitySeeds, Is.EqualTo(2));
            Assert.That(result.whyEarned.items, Has.Length.EqualTo(1));
        }

        [Test]
        public void MissingAuthFailsBeforeNetwork()
        {
            var http = new FakeHttp(200, ValidSnapshot());
            var client = new WorldGamificationReadClient(
                "https://api.example.test",
                new StaticToken("short"),
                http);

            var error = Assert.ThrowsAsync<WorldGamificationClientException>(() =>
                client.ReadAsync(null, CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldGamificationClientErrorCode.AuthRequired));
            Assert.That(http.Calls, Is.EqualTo(0));
        }

        [Test]
        public void InvalidRegionFailsBeforeNetwork()
        {
            var http = new FakeHttp(200, ValidSnapshot());
            var client = new WorldGamificationReadClient(
                "https://api.example.test",
                new StaticToken(Token),
                http);

            var error = Assert.ThrowsAsync<WorldGamificationClientException>(() =>
                client.ReadAsync("48.8584,2.2945", CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldGamificationClientErrorCode.InvalidRegion));
            Assert.That(http.Calls, Is.EqualTo(0));
        }

        [Test]
        public void UnknownTopLevelProgressionFieldFailsClosed()
        {
            var value = JObject.Parse(ValidSnapshot());
            value["xp"] = 9001;

            var error = Assert.Throws<WorldGamificationClientException>(() =>
                WorldGamificationReadClient.ParseSnapshot(value.ToString(Formatting.None)));

            Assert.That(error.Code, Is.EqualTo(WorldGamificationClientErrorCode.InvalidResponse));
        }

        [Test]
        public void RawSourceRefInProvenanceFailsClosed()
        {
            var value = JObject.Parse(ValidSnapshot());
            var first = (JObject)value["whyEarned"]["items"][0];
            first["sourceRef"] = "community:post:11111111-1111-4111-8111-111111111111";

            var error = Assert.Throws<WorldGamificationClientException>(() =>
                WorldGamificationReadClient.ParseSnapshot(value.ToString(Formatting.None)));

            Assert.That(error.Code, Is.EqualTo(WorldGamificationClientErrorCode.InvalidResponse));
        }

        [Test]
        public void DuplicateOwnedItemFailsClosed()
        {
            var value = JObject.Parse(ValidSnapshot());
            value["ownedItemIds"] = new JArray("breiz-mini-lighthouse", "breiz-mini-lighthouse");

            var error = Assert.Throws<WorldGamificationClientException>(() =>
                WorldGamificationReadClient.ParseSnapshot(value.ToString(Formatting.None)));

            Assert.That(error.Code, Is.EqualTo(WorldGamificationClientErrorCode.InvalidResponse));
        }

        [Test]
        public void DuplicateJsonPropertyFailsClosed()
        {
            var duplicate =
                "{\"authority\":\"CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY\"," +
                "\"authority\":\"CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY\"}";

            var error = Assert.Throws<WorldGamificationClientException>(() =>
                WorldGamificationReadClient.ParseSnapshot(duplicate));

            Assert.That(error.Code, Is.EqualTo(WorldGamificationClientErrorCode.InvalidResponse));
        }

        [Test]
        public void ServerFailureMapsToBoundedUnavailableError()
        {
            var http = new FakeHttp(503, "{\"error\":\"database detail must not escape\"}");
            var client = new WorldGamificationReadClient(
                "https://api.example.test",
                new StaticToken(Token),
                http);

            var error = Assert.ThrowsAsync<WorldGamificationClientException>(() =>
                client.ReadAsync("GLOBAL", CancellationToken.None));

            Assert.That(error.Code, Is.EqualTo(WorldGamificationClientErrorCode.Unavailable));
            Assert.That(error.Message, Does.Not.Contain("database"));
        }

        private static string ValidSnapshot() =>
            "{" +
            "\"authority\":\"CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY\"," +
            "\"region\":{\"code\":\"FR-BRE\",\"identityName\":\"Breiz\",\"themeId\":\"breiz-v1\"}," +
            "\"resources\":{" +
                "\"knowledgeFragments\":1," +
                "\"localDiscoveries\":2," +
                "\"walkTraces\":0," +
                "\"communitySeeds\":2," +
                "\"memoryThreads\":0" +
            "}," +
            "\"quests\":[{" +
                "\"id\":\"community-first\"," +
                "\"title\":\"Contribuer\"," +
                "\"category\":\"community\"," +
                "\"eventKind\":\"community.contribution_created\"," +
                "\"current\":1," +
                "\"target\":1," +
                "\"completed\":true" +
            "}]," +
            "\"whyEarned\":{" +
                "\"authority\":\"CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY\"," +
                "\"items\":[{" +
                    "\"eventId\":\"11111111-1111-4111-8111-111111111111\"," +
                    "\"reasonCode\":\"community_contribution\"," +
                    "\"grants\":{\"communitySeeds\":2}," +
                    "\"recordedAt\":\"2026-10-02T12:00:00.000Z\"" +
                "}]," +
                "\"grossEarned\":{" +
                    "\"knowledgeFragments\":1," +
                    "\"localDiscoveries\":2," +
                    "\"walkTraces\":0," +
                    "\"communitySeeds\":2," +
                    "\"memoryThreads\":0" +
                "}" +
            "}," +
            "\"collectionItems\":[{" +
                "\"id\":\"breiz-mini-lighthouse\"," +
                "\"title\":\"Mini phare\"," +
                "\"owned\":true," +
                "\"affordable\":true" +
            "}]," +
            "\"ownedItemIds\":[\"breiz-mini-lighthouse\"]" +
            "}";

        private sealed class StaticToken : IWorldAccessTokenProvider
        {
            private readonly string token;

            public StaticToken(string token) => this.token = token;

            public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
                Task.FromResult(token);
        }

        private sealed class FakeHttp : IWorldHttpTransport
        {
            private readonly WorldHttpResponse response;

            public FakeHttp(long statusCode, string body) =>
                response = new WorldHttpResponse(statusCode, body);

            public int Calls { get; private set; }
            public string LastMethod { get; private set; }
            public string LastUrl { get; private set; }
            public string LastBearer { get; private set; }
            public string LastBody { get; private set; }

            public Task<WorldHttpResponse> SendAsync(
                string method,
                string absoluteUrl,
                string bearerToken,
                string jsonBody,
                CancellationToken cancellationToken)
            {
                Calls++;
                LastMethod = method;
                LastUrl = absoluteUrl;
                LastBearer = bearerToken;
                LastBody = jsonBody;
                return Task.FromResult(response);
            }
        }
    }
}
