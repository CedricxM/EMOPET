using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using NUnit.Framework;
using UnityEngine;

namespace Emopet.World.Tests
{
    public sealed class WorldBackendClientLiveTests
    {
        [Test]
        public async Task LiveTwoUserBootstrapPresenceChatRenewalAndDegradedTransport()
        {
            var fixture = LoadFixture();
            if (fixture == null)
            {
                Assert.Ignore("Start backend/test/world-spike-unity-host.mjs before running the live Unity test.");
                return;
            }

            Assert.That(Uri.TryCreate(fixture.baseUrl, UriKind.Absolute, out var baseUri), Is.True);
            Assert.That(baseUri.IsLoopback, Is.True, "Live World harness must stay loopback-only.");
            Assert.That(baseUri.Scheme, Is.EqualTo(Uri.UriSchemeHttp));
            Assert.That(Guid.TryParse(fixture.userAId, out _), Is.True);
            Assert.That(Guid.TryParse(fixture.userBId, out _), Is.True);
            Assert.That(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - fixture.createdAtUnixMs,
                Is.InRange(0, 10 * 60 * 1000), "Live harness fixture is stale.");

            var transport = new UnityWebRequestWorldHttpTransport();
            var backendA = new WorldBackendClient(
                fixture.baseUrl,
                new StaticTokenProvider(fixture.tokenA),
                transport);
            var backendB = new WorldBackendClient(
                fixture.baseUrl,
                new StaticTokenProvider(fixture.tokenB),
                transport);
            var sessionA = new WorldSessionCoordinator(backendA);
            var sessionB = new WorldSessionCoordinator(backendB);

            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
            var token = timeout.Token;

            await sessionA.ConnectAsync(token);
            await sessionB.ConnectAsync(token);
            Assert.That(sessionA.State, Is.EqualTo(WorldSessionState.ConnectedInvisible));
            Assert.That(sessionB.State, Is.EqualTo(WorldSessionState.ConnectedInvisible));

            var friends = await backendA.FriendsListAsync(sessionA.Handle, token);
            StringAssert.Contains(fixture.userBId, friends);

            await sessionB.ShowPresenceAsync(token);
            Assert.That(sessionB.State, Is.EqualTo(WorldSessionState.ConnectedVisible));
            await backendA.FollowPresenceAsync(sessionA.Handle, fixture.userBId, token);
            await backendB.UpdatePresenceAsync(sessionB.Handle, "away", token);
            await WaitForPresenceAsync(sessionA, token);

            var created = JsonUtility.FromJson<GroupEnvelope>(
                await backendA.CreateGroupAsync(sessionA.Handle, "unity-live-" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(), token));
            Assert.That(created?.result?.groupId, Is.Not.Null.And.Not.Empty);

            var groupId = created.result.groupId;
            await backendB.JoinGroupAsync(sessionB.Handle, groupId, token);
            await backendA.JoinChatAsync(sessionA.Handle, groupId, token);
            await backendB.JoinChatAsync(sessionB.Handle, groupId, token);

            await backendA.SendPresetAsync(sessionA.Handle, groupId, "salut", token);
            await WaitForPresetAsync(sessionB, "salut", token);

            var previousHandle = sessionA.Handle;
            var renewed = await backendA.BootstrapAsync(previousHandle, token);
            Assert.That(Guid.TryParse(renewed.handle, out _), Is.True);
            Assert.That(renewed.handle, Is.Not.EqualTo(previousHandle));
            Assert.That(renewed.state, Is.EqualTo("connected"));

            await backendB.SendPresetAsync(sessionB.Handle, groupId, "pret", token);
            await WaitForPresetAsync(backendA, renewed.handle, "pret", token);

            await backendA.DisconnectAsync(renewed.handle, token);
            await sessionB.DisconnectAsync(token);

            using var deadTimeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var unavailable = new WorldSessionCoordinator(new WorldBackendClient(
                "http://127.0.0.1:1",
                new StaticTokenProvider(fixture.tokenA),
                new UnityWebRequestWorldHttpTransport()));
            WorldBackendException error = null;

            try
            {
                await unavailable.ConnectAsync(deadTimeout.Token);
                Assert.Fail("Expected unavailable World backend connection to fail.");
            }
            catch (WorldBackendException caught)
            {
                error = caught;
            }

            Assert.That(error, Is.Not.Null);
            Assert.That(error.Code, Is.EqualTo(WorldErrorCode.Unavailable));
            Assert.That(unavailable.State, Is.EqualTo(WorldSessionState.Degraded));
        }

        private static async Task WaitForPresenceAsync(
            WorldSessionCoordinator session,
            CancellationToken cancellationToken)
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
            while (DateTimeOffset.UtcNow < deadline)
            {
                var batch = await session.PollEventsAsync(cancellationToken);
                foreach (var item in batch.events)
                {
                    if (item.type == "presence" || item.type == "channel-presence")
                        return;
                }
                await Task.Delay(100, cancellationToken);
            }

            Assert.Fail("Expected a live presence event from the World harness.");
        }

        private static async Task WaitForPresetAsync(
            WorldSessionCoordinator session,
            string preset,
            CancellationToken cancellationToken)
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
            while (DateTimeOffset.UtcNow < deadline)
            {
                var batch = await session.PollEventsAsync(cancellationToken);
                if (ContainsPreset(batch, preset))
                    return;
                await Task.Delay(100, cancellationToken);
            }

            Assert.Fail("Expected a live preset chat event from the World harness.");
        }

        private static async Task WaitForPresetAsync(
            WorldBackendClient backend,
            string handle,
            string preset,
            CancellationToken cancellationToken)
        {
            var deadline = DateTimeOffset.UtcNow.AddSeconds(10);
            while (DateTimeOffset.UtcNow < deadline)
            {
                var batch = await backend.GetEventsAsync(handle, cancellationToken);
                if (ContainsPreset(batch, preset))
                    return;
                await Task.Delay(100, cancellationToken);
            }

            Assert.Fail("Expected a live preset chat event after World session renewal.");
        }

        private static bool ContainsPreset(WorldEventsResult batch, string preset)
        {
            if (batch?.events == null)
                return false;

            foreach (var item in batch.events)
            {
                if (item?.type == "chat" && item.value?.content?.preset == preset)
                    return true;
            }
            return false;
        }

        private static LiveFixture LoadFixture()
        {
            var projectRoot = Directory.GetParent(Application.dataPath)?.FullName;
            if (string.IsNullOrEmpty(projectRoot))
                return null;

            var fixturePath = Path.Combine(projectRoot, "Temp", "world-live-harness.json");
            if (!File.Exists(fixturePath))
                return null;

            var fixture = JsonUtility.FromJson<LiveFixture>(File.ReadAllText(fixturePath));
            if (fixture == null
                || string.IsNullOrWhiteSpace(fixture.baseUrl)
                || string.IsNullOrWhiteSpace(fixture.tokenA)
                || string.IsNullOrWhiteSpace(fixture.tokenB))
            {
                Assert.Fail("World live harness fixture is malformed.");
            }

            return fixture;
        }

        [Serializable]
        private sealed class LiveFixture
        {
            public string baseUrl;
            public long createdAtUnixMs;
            public string userAId;
            public string userBId;
            public string tokenA;
            public string tokenB;
        }

        [Serializable]
        private sealed class GroupEnvelope
        {
            public GroupResult result;
        }

        [Serializable]
        private sealed class GroupResult
        {
            public string groupId;
        }

        private sealed class StaticTokenProvider : IWorldAccessTokenProvider
        {
            private readonly string token;

            public StaticTokenProvider(string token)
            {
                this.token = token;
            }

            public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
            {
                cancellationToken.ThrowIfCancellationRequested();
                return Task.FromResult(token);
            }
        }
    }
}
