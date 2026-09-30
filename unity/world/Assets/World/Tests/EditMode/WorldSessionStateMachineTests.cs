using System;
using NUnit.Framework;

namespace Emopet.World.Tests
{
    public sealed class WorldSessionStateMachineTests
    {
        [Test]
        public void FreshBootstrapStartsInvisible()
        {
            var state = new WorldSessionStateMachine();

            state.BeginBootstrap();
            state.BootstrapConnected();

            Assert.That(state.State, Is.EqualTo(WorldSessionState.ConnectedInvisible));
            Assert.That(state.CanSendCommands, Is.True);
        }

        [Test]
        public void VisibilityIsExplicitAndReversible()
        {
            var state = new WorldSessionStateMachine();
            state.BeginBootstrap();
            state.BootstrapConnected();

            state.PresenceBecameVisible();
            Assert.That(state.State, Is.EqualTo(WorldSessionState.ConnectedVisible));

            state.PresenceBecameInvisible();
            Assert.That(state.State, Is.EqualTo(WorldSessionState.ConnectedInvisible));
        }

        [Test]
        public void RevokedSessionCannotBootstrapWithoutFreshCoordinator()
        {
            var state = new WorldSessionStateMachine();
            state.MarkRevoked();

            Assert.Throws<InvalidOperationException>(() => state.BeginBootstrap());
        }

        [Test]
        public void PresetListIsClosed()
        {
            Assert.That(WorldPresets.IsAllowed(WorldPresets.Salut), Is.True);
            Assert.That(WorldPresets.IsAllowed("free-text"), Is.False);
        }
    }
}
