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
                ApplyFailure(error);
                throw;
            }
        }

        public async Task ShowPresenceAsync(CancellationToken cancellationToken)
        {
            EnsureConnected();

            try
            {
                var result = await backend.ShowPresenceAsync(Handle, cancellationToken);
                if (result == null || result.presence != "visible" || result.until <= 0)
                    throw new WorldBackendException(WorldErrorCode.Unavailable, 200);

                if (State == WorldSessionState.ConnectedInvisible)
                    stateMachine.PresenceBecameVisible();
            }
            catch (WorldBackendException error)
            {
                ApplyFailure(error);
                throw;
            }
        }

        public async Task HidePresenceAsync(CancellationToken cancellationToken)
        {
            if (State != WorldSessionState.ConnectedVisible)
                return;

            try
            {
                await backend.HidePresenceAsync(Handle, cancellationToken);
            }
            finally
            {
                // The backend closes the World session before persisting the canonical
                // presence withdrawal. Even a later 503 therefore leaves this handle dead.
                Handle = null;
                ExpiresAtUnixMs = 0;
                stateMachine.Disconnect();
            }
        }

        public async Task<WorldEventsResult> PollEventsAsync(CancellationToken cancellationToken)
        {
            EnsureConnected();

            try
            {
                var result = await backend.GetEventsAsync(Handle, cancellationToken);
                if (result == null || result.state != "connected" || result.events == null)
                    throw new WorldBackendException(WorldErrorCode.Unavailable, 200);

                return result;
            }
            catch (WorldBackendException error)
            {
                ApplyFailure(error);
                throw;
            }
        }

        public async Task DisconnectAsync(CancellationToken cancellationToken)
        {
            var handle = Handle;
            Handle = null;
            ExpiresAtUnixMs = 0;

            try
            {
                if (!string.IsNullOrEmpty(handle))
                    await backend.DisconnectAsync(handle, cancellationToken);
            }
            catch (WorldBackendException)
            {
                // Disconnect is best-effort: local state must still close.
            }
            finally
            {
                stateMachine.Disconnect();
            }
        }

        public void MarkRevokedLocally()
        {
            Handle = null;
            ExpiresAtUnixMs = 0;
            stateMachine.MarkRevoked();
        }

        private void ApplyFailure(WorldBackendException error)
        {
            switch (error.Code)
            {
                case WorldErrorCode.InvalidSession:
                case WorldErrorCode.Forbidden:
                    Handle = null;
                    ExpiresAtUnixMs = 0;
                    stateMachine.MarkRevoked();
                    break;
                case WorldErrorCode.Unavailable:
                case WorldErrorCode.Timeout:
                    stateMachine.MarkDegraded();
                    break;
            }
        }

        private void EnsureConnected()
        {
            if (!stateMachine.CanSendCommands || string.IsNullOrEmpty(Handle))
                throw new InvalidOperationException($"World session is not connected ({State}).");
        }
    }
}
