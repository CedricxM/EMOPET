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
            var previousHandle = Handle;
            stateMachine.BeginBootstrap();

            try
            {
                WorldBootstrapResult result;
                try
                {
                    result = await backend.BootstrapAsync(previousHandle, cancellationToken);
                }
                catch (WorldBackendException error) when (
                    error.Code == WorldErrorCode.InvalidSession && !string.IsNullOrEmpty(previousHandle))
                {
                    // The uncertain/previous server handle is gone. Retry once as a fresh
                    // invisible session instead of turning a recoverable reconnect into revocation.
                    Handle = null;
                    ExpiresAtUnixMs = 0;
                    result = await backend.BootstrapAsync(null, cancellationToken);
                }

                var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                if (result == null || !Guid.TryParse(result.handle, out _) || result.state != "connected"
                    || result.expiresAt <= now)
                {
                    throw new WorldBackendException(WorldErrorCode.InvalidSession, 503);
                }

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
                ClearDisconnected();
            }
            catch (WorldBackendException error) when (error.StatusCode > 0)
            {
                // An HTTP response proves the backend handled the request. The server-side
                // withdrawal path drops the World handle before persisting canonical consent,
                // so even a later 503 leaves this handle dead.
                ClearDisconnected();
                throw;
            }
            catch (WorldBackendException)
            {
                // No HTTP response: we cannot know whether the DELETE reached the backend.
                // Preserve the handle only as uncertain evidence and never claim invisibility.
                stateMachine.MarkDegraded();
                throw;
            }
            catch (OperationCanceledException)
            {
                // Cancellation may happen before or after transport dispatch. Do not tell the
                // user they are invisible unless the backend outcome is known.
                stateMachine.MarkDegraded();
                throw;
            }
        }

        public async Task<WorldEventsResult> PollEventsAsync(CancellationToken cancellationToken)
        {
            EnsureConnected();

            try
            {
                var result = await backend.GetEventsAsync(Handle, cancellationToken);
                if (!ValidEvents(result))
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

        private void ClearDisconnected()
        {
            Handle = null;
            ExpiresAtUnixMs = 0;
            stateMachine.Disconnect();
        }

        public void MarkRevokedLocally()
        {
            Handle = null;
            ExpiresAtUnixMs = 0;
            stateMachine.MarkRevoked();
        }

        private static bool ValidEvents(WorldEventsResult result)
        {
            if (result == null || result.state != "connected" || result.events == null)
                return false;

            foreach (var item in result.events)
            {
                if (item == null || item.value == null)
                    return false;

                if (item.type == "chat")
                {
                    if (string.IsNullOrWhiteSpace(item.value.channelId)
                        || string.IsNullOrWhiteSpace(item.value.senderId)
                        || !Guid.TryParse(item.value.messageId, out _)
                        || item.value.content == null
                        || !WorldPresets.IsAllowed(item.value.content.preset))
                    {
                        return false;
                    }

                    continue;
                }

                if (item.type == "presence" || item.type == "channel-presence")
                {
                    if (!ValidPresenceRows(item.value.joins) || !ValidPresenceRows(item.value.leaves))
                        return false;

                    continue;
                }

                return false;
            }

            return true;
        }

        private static bool ValidPresenceRows(WorldPresenceRowDto[] rows)
        {
            if (rows == null)
                return false;

            foreach (var row in rows)
            {
                if (row == null || string.IsNullOrWhiteSpace(row.user_id))
                    return false;

                if (!string.IsNullOrEmpty(row.status) && row.status != "online" && row.status != "away")
                    return false;
            }

            return true;
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
