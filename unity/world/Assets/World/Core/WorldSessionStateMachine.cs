using System;

namespace Emopet.World
{
    public sealed class WorldSessionStateMachine
    {
        public WorldSessionState State { get; private set; } = WorldSessionState.SignedOut;

        public bool CanSendCommands =>
            State == WorldSessionState.ConnectedInvisible ||
            State == WorldSessionState.ConnectedVisible;

        public void BeginBootstrap()
        {
            if (State != WorldSessionState.SignedOut &&
                State != WorldSessionState.Disconnected &&
                State != WorldSessionState.Degraded)
            {
                throw new InvalidOperationException($"Cannot bootstrap from {State}.");
            }

            State = WorldSessionState.Bootstrapping;
        }

        public void BootstrapConnected()
        {
            Require(WorldSessionState.Bootstrapping);
            State = WorldSessionState.ConnectedInvisible;
        }

        public void PresenceBecameVisible()
        {
            Require(WorldSessionState.ConnectedInvisible);
            State = WorldSessionState.ConnectedVisible;
        }

        public void PresenceBecameInvisible()
        {
            Require(WorldSessionState.ConnectedVisible);
            State = WorldSessionState.ConnectedInvisible;
        }

        public void MarkDegraded()
        {
            if (State == WorldSessionState.Revoked || State == WorldSessionState.Disconnected)
                return;

            State = WorldSessionState.Degraded;
        }

        public void MarkRevoked() => State = WorldSessionState.Revoked;

        public void Disconnect() => State = WorldSessionState.Disconnected;

        private void Require(WorldSessionState expected)
        {
            if (State != expected)
                throw new InvalidOperationException($"Expected {expected}, got {State}.");
        }
    }
}
