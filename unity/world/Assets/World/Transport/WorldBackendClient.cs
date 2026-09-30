using System;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;

namespace Emopet.World
{
    public sealed class WorldBackendClient
    {
        private const string Mount = "/api/world-spike";
        private readonly string baseUrl;
        private readonly IWorldAccessTokenProvider tokenProvider;
        private readonly IWorldHttpTransport http;

        public WorldBackendClient(
            string baseUrl,
            IWorldAccessTokenProvider tokenProvider,
            IWorldHttpTransport http)
        {
            this.baseUrl = string.IsNullOrWhiteSpace(baseUrl)
                ? throw new ArgumentException("Base URL is required.", nameof(baseUrl))
                : baseUrl.TrimEnd('/');
            this.tokenProvider = tokenProvider ?? throw new ArgumentNullException(nameof(tokenProvider));
            this.http = http ?? throw new ArgumentNullException(nameof(http));
        }

        public async Task<WorldBootstrapResult> BootstrapAsync(
            string previousHandle,
            CancellationToken cancellationToken)
        {
            var body = string.IsNullOrEmpty(previousHandle)
                ? "{}"
                : JsonUtility.ToJson(new PreviousHandleBody { previousHandle = previousHandle });

            var response = await SendAsync("POST", $"{Mount}/bootstrap", body, cancellationToken);
            return JsonUtility.FromJson<WorldBootstrapResult>(response);
        }

        public Task<string> FriendsListAsync(string handle, CancellationToken cancellationToken) =>
            CommandAsync(handle, JsonUtility.ToJson(new OpOnly { op = "friends.list" }), cancellationToken);

        public Task<string> GroupsListAsync(string handle, CancellationToken cancellationToken) =>
            CommandAsync(handle, JsonUtility.ToJson(new OpOnly { op = "groups.list" }), cancellationToken);

        public Task<string> CreateGroupAsync(string handle, string name, CancellationToken cancellationToken) =>
            CommandAsync(handle, JsonUtility.ToJson(new GroupNameCommand { op = "groups.create", name = name }), cancellationToken);

        public Task<string> JoinGroupAsync(string handle, string groupId, CancellationToken cancellationToken) =>
            GroupCommandAsync(handle, "groups.join", groupId, cancellationToken);

        public Task<string> LeaveGroupAsync(string handle, string groupId, CancellationToken cancellationToken) =>
            GroupCommandAsync(handle, "groups.leave", groupId, cancellationToken);

        public Task<string> JoinChatAsync(string handle, string groupId, CancellationToken cancellationToken) =>
            GroupCommandAsync(handle, "chat.join", groupId, cancellationToken);

        public Task<string> FollowPresenceAsync(string handle, string targetUserId, CancellationToken cancellationToken) =>
            CommandAsync(handle, JsonUtility.ToJson(new FollowCommand { op = "presence.follow", targetUserId = targetUserId }), cancellationToken);

        public Task<string> UpdatePresenceAsync(string handle, string status, CancellationToken cancellationToken)
        {
            if (status != "online" && status != "away")
                throw new ArgumentException("World presence must be online or away.", nameof(status));

            return CommandAsync(handle, JsonUtility.ToJson(new PresenceCommand { op = "presence.update", status = status }), cancellationToken);
        }

        public Task<string> SendPresetAsync(
            string handle,
            string groupId,
            string presetId,
            CancellationToken cancellationToken)
        {
            if (!WorldPresets.IsAllowed(presetId))
                throw new ArgumentException("Preset id is not part of the closed World first-slice list.", nameof(presetId));

            return CommandAsync(handle, JsonUtility.ToJson(new PresetCommand
            {
                op = "chat.send",
                groupId = groupId,
                presetId = presetId,
            }), cancellationToken);
        }

        public async Task<WorldEventsResult> GetEventsAsync(string handle, CancellationToken cancellationToken)
        {
            var response = await SendAsync("GET", $"{Mount}/sessions/{RequireId(handle)}/events", null, cancellationToken);
            return JsonUtility.FromJson<WorldEventsResult>(response);
        }

        public async Task<WorldPresenceResult> ShowPresenceAsync(string handle, CancellationToken cancellationToken)
        {
            var response = await SendAsync("POST", $"{Mount}/sessions/{RequireId(handle)}/presence", "{}", cancellationToken);
            return JsonUtility.FromJson<WorldPresenceResult>(response);
        }

        public Task HidePresenceAsync(string handle, CancellationToken cancellationToken) =>
            SendNoContentAsync("DELETE", $"{Mount}/sessions/{RequireId(handle)}/presence", cancellationToken);

        public Task DisconnectAsync(string handle, CancellationToken cancellationToken) =>
            SendNoContentAsync("DELETE", $"{Mount}/sessions/{RequireId(handle)}", cancellationToken);

        private Task<string> GroupCommandAsync(string handle, string op, string groupId, CancellationToken cancellationToken) =>
            CommandAsync(handle, JsonUtility.ToJson(new GroupIdCommand { op = op, groupId = groupId }), cancellationToken);

        private async Task<string> CommandAsync(string handle, string body, CancellationToken cancellationToken) =>
            await SendAsync("POST", $"{Mount}/sessions/{RequireId(handle)}/commands", body, cancellationToken);

        private async Task SendNoContentAsync(string method, string path, CancellationToken cancellationToken) =>
            _ = await SendAsync(method, path, null, cancellationToken);

        private async Task<string> SendAsync(
            string method,
            string path,
            string body,
            CancellationToken cancellationToken)
        {
            var token = await tokenProvider.GetAccessTokenAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(token))
                throw new WorldBackendException(WorldErrorCode.InvalidSession, 401);

            var response = await http.SendAsync(method, baseUrl + path, token, body, cancellationToken);
            if (response.StatusCode >= 200 && response.StatusCode < 300)
                return response.Body;

            throw ParseError(response);
        }

        private static WorldBackendException ParseError(WorldHttpResponse response)
        {
            // UnityWebRequest uses responseCode 0 when no HTTP response was obtained
            // (for example connection/DNS/TLS transport failure). Keep client detail bounded.
            if (response.StatusCode <= 0)
                return new WorldBackendException(WorldErrorCode.Unavailable, response.StatusCode);

            var error = string.Empty;
            if (!string.IsNullOrEmpty(response.Body))
            {
                try { error = JsonUtility.FromJson<ErrorBody>(response.Body)?.error ?? string.Empty; }
                catch (ArgumentException) { }
            }

            return new WorldBackendException(error switch
            {
                "invalid_request" => WorldErrorCode.InvalidRequest,
                "invalid_session" => WorldErrorCode.InvalidSession,
                "forbidden" => WorldErrorCode.Forbidden,
                "unreachable" => WorldErrorCode.Unreachable,
                "busy" => WorldErrorCode.Busy,
                "unavailable" => WorldErrorCode.Unavailable,
                "timeout" => WorldErrorCode.Timeout,
                _ => WorldErrorCode.Unknown,
            }, response.StatusCode);
        }

        private static string RequireId(string value)
        {
            if (string.IsNullOrWhiteSpace(value) || !Guid.TryParse(value, out _))
                throw new ArgumentException("World handles and canonical ids must be UUIDs.");
            return value;
        }

        [Serializable] private sealed class PreviousHandleBody { public string previousHandle; }
        [Serializable] private sealed class OpOnly { public string op; }
        [Serializable] private sealed class GroupNameCommand { public string op; public string name; }
        [Serializable] private sealed class GroupIdCommand { public string op; public string groupId; }
        [Serializable] private sealed class FollowCommand { public string op; public string targetUserId; }
        [Serializable] private sealed class PresenceCommand { public string op; public string status; }
        [Serializable] private sealed class PresetCommand { public string op; public string groupId; public string presetId; }
        [Serializable] private sealed class ErrorBody { public string error; }
    }

    [Serializable]
    public sealed class WorldBootstrapResult
    {
        public string handle;
        public long expiresAt;
        public string state;
    }

    [Serializable]
    public sealed class WorldEventsResult
    {
        public string state;
        public bool resyncRequired;
        public WorldEventDto[] events;
    }

    [Serializable]
    public sealed class WorldEventDto
    {
        public string type;
        public WorldEventValueDto value;
    }

    [Serializable]
    public sealed class WorldEventValueDto
    {
        public string channelId;
        public string senderId;
        public string messageId;
        public WorldEventContentDto content;
        public WorldPresenceRowDto[] joins;
        public WorldPresenceRowDto[] leaves;
    }

    [Serializable]
    public sealed class WorldEventContentDto
    {
        public string preset;
    }

    [Serializable]
    public sealed class WorldPresenceRowDto
    {
        public string user_id;
        public string status;
    }

    [Serializable]
    public sealed class WorldPresenceResult
    {
        public string presence;
        public long until;
    }
}
