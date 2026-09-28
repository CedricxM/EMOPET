using System;
using System.Threading;
using System.Threading.Tasks;

namespace Emopet.World
{
    public sealed class WorldSessionCoordinator
    {
        private readonly WorldBackendClient backend;
        private readonly WorldSessionStateMachine stateMachine = new WorldSessionStateMachine();

        public WorldSessionCoordinator(WorldBackendClient backend)
        {
            this.backend = backend ?? throw new ArgumentNullException(nameof(backend));
        }

        public WorldSessionState State => stateMachine.State;
        public string Handle { get; private set; }
        public long ExpiresAtUnixMs { get; private set; }

        public async Task ConnectAsync(CancellationToken cancellationToken)
        {
            stateMachine.BeginBootstrap();

            try
            {
                var result = await backend.BootstrapAsync(Handle, cancellationToken);
                if (result == null || !Guid.TryParse(result.handle, out _) || result.state != "connected")
                    throw new WorldBackendException(WorldErrorCode.InvalidSession, 503);

                Handle = result.handle;
                ExpiresAtUnixMs = result.expiresAt;
                stateMachine.BootstrapConnected();
            }
            catch (WorldBackendException error)
            {
                if (error.Code == WorldErrorCode.Forbidden || error.Code == WorldErrorCode.InvalidSession)
                    stateMachine.MarkRevoked();
                else
                    stateMachine.MarkDegraded();
                throw;
            }
        }

        public async Task ShowPresenceAsync(CancellationToken cancellationToken)
        {
            EnsureConnected();
            await backend.ShowPresenceAsync(Handle, cancellationToken);
            if (State == WorldSessionState.ConnectedInvisible)
                stateMachine.PresenceBecameVisible();
        }

        public async Task HidePresenceAsync(CancellationToken cancellationToken)
        {
            if (State != WorldSessionState.ConnectedVisible)
                return;

            await backend.HidePresenceAsync(Handle, cancellationToken);
            stateMachine.PresenceBecameInvisible();
        }

        public Task<WorldEventsResult> PollEventsAsync(CancellationToken cancellationToken)
        {
            EnsureConnected();
            return backend.GetEventsAsync(Handle, cancellationToken);
        }

        public async Task DisconnectAsync(CancellationToken cancellationToken)
        {
            var handle = Handle;
            Handle = null;
            ExpiresAtUnixMs = 0;

            if (!string.IsNullOrEmpty(handle))
            {
                try { await backend.DisconnectAsync(handle, cancellationToken); }
                catch (WorldBackendException) { }
            }

            stateMachine.Disconnect();
        }

        public void MarkRevokedLocally()
        {
            Handle = null;
            ExpiresAtUnixMs = 0;
            stateMachine.MarkRevoked();
        }

        private void EnsureConnected()
        {
            if (!stateMachine.CanSendCommands || string.IsNullOrEmpty(Handle))
                throw new InvalidOperationException($"World session is not connected ({State}).");
        }
    }
}
