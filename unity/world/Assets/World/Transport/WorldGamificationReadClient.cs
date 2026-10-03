using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Emopet.World
{
    public enum WorldGamificationClientErrorCode
    {
        AuthRequired = 0,
        InvalidRegion = 1,
        Unavailable = 2,
        InvalidResponse = 3,
    }

    public sealed class WorldGamificationClientException : Exception
    {
        public WorldGamificationClientException(WorldGamificationClientErrorCode code)
            : base($"World gamification read failed: {code}.")
        {
            Code = code;
        }

        public WorldGamificationClientErrorCode Code { get; }
    }

    public sealed class WorldGamificationBalanceDto
    {
        public long knowledgeFragments;
        public long localDiscoveries;
        public long walkTraces;
        public long communitySeeds;
        public long memoryThreads;
    }

    public sealed class WorldGamificationRegionDto
    {
        public string code;
        public string identityName;
        public string themeId;
    }

    public sealed class WorldGamificationQuestDto
    {
        public string id;
        public string title;
        public string category;
        public string eventKind;
        public long current;
        public long target;
        public bool completed;
    }

    public sealed class WorldGamificationGrantDto
    {
        public long? knowledgeFragments;
        public long? localDiscoveries;
        public long? walkTraces;
        public long? communitySeeds;
        public long? memoryThreads;
    }

    public sealed class WorldGamificationWhyEarnedItemDto
    {
        public string eventId;
        public string reasonCode;
        public WorldGamificationGrantDto grants;
        public string recordedAt;
    }

    public sealed class WorldGamificationWhyEarnedDto
    {
        public string authority;
        public WorldGamificationWhyEarnedItemDto[] items;
        public WorldGamificationBalanceDto grossEarned;
    }

    public sealed class WorldGamificationCollectionItemDto
    {
        public string id;
        public string title;
        public bool owned;
        public bool affordable;
    }

    public sealed class WorldGamificationReadSnapshotDto
    {
        public string authority;
        public WorldGamificationRegionDto region;
        public WorldGamificationBalanceDto resources;
        public WorldGamificationQuestDto[] quests;
        public WorldGamificationWhyEarnedDto whyEarned;
        public WorldGamificationCollectionItemDto[] collectionItems;
        public string[] ownedItemIds;
    }

    /// <summary>
    /// Gate 5B foundation only.
    ///
    /// Read-only client for the controlled World gamification snapshot.
    /// Nothing in the current Unity scenes/session coordinators constructs this type.
    /// It accepts no Owner id and exposes no write operation.
    /// </summary>
    public sealed class WorldGamificationReadClient
    {
        public const string Authority = "CONTROLLED_DRAFT_NOT_PRODUCTION_AUTHORITY";
        private const string Mount = "/api/world-gamification";
        private const long MaxSafeInteger = 9007199254740991L;

        private static readonly string[] ResourceKeys =
        {
            "knowledgeFragments",
            "localDiscoveries",
            "walkTraces",
            "communitySeeds",
            "memoryThreads",
        };

        private static readonly HashSet<string> QuestCategories = new HashSet<string>
        {
            "learning",
            "local",
            "community",
            "world",
            "memory",
        };

        private static readonly HashSet<string> EventKinds = new HashSet<string>
        {
            "knowledge.card_read",
            "local.place_saved",
            "local.route_saved",
            "community.contribution_created",
            "world.group_joined",
            "memory.created",
        };

        private static readonly HashSet<string> ReasonCodes = new HashSet<string>
        {
            "knowledge_read",
            "local_place_saved",
            "local_route_saved",
            "community_contribution",
            "world_group_joined",
            "memory_created",
        };

        private static readonly Regex RegionCode = new Regex(
            "^[A-Z]{2}-[A-Z0-9]{1,3}$",
            RegexOptions.CultureInvariant);

        private readonly string baseUrl;
        private readonly IWorldAccessTokenProvider tokenProvider;
        private readonly IWorldHttpTransport http;

        public WorldGamificationReadClient(
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

        public async Task<WorldGamificationReadSnapshotDto> ReadAsync(
            string regionCode,
            CancellationToken cancellationToken)
        {
            var token = (await tokenProvider.GetAccessTokenAsync(cancellationToken))?.Trim();
            if (string.IsNullOrEmpty(token) || token.Length < 16 || token.Contains("\r") || token.Contains("\n"))
                throw new WorldGamificationClientException(WorldGamificationClientErrorCode.AuthRequired);

            var normalizedRegion = NormalizeRequestedRegion(regionCode);
            var query = normalizedRegion == null
                ? string.Empty
                : $"?region={Uri.EscapeDataString(normalizedRegion)}";

            WorldHttpResponse response;
            try
            {
                response = await http.SendAsync(
                    "GET",
                    baseUrl + Mount + query,
                    token,
                    null,
                    cancellationToken);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                throw new WorldGamificationClientException(WorldGamificationClientErrorCode.Unavailable);
            }

            if (response.StatusCode == 401 || response.StatusCode == 403)
                throw new WorldGamificationClientException(WorldGamificationClientErrorCode.AuthRequired);

            if (response.StatusCode < 200 || response.StatusCode >= 300)
                throw new WorldGamificationClientException(WorldGamificationClientErrorCode.Unavailable);

            return ParseSnapshot(response.Body);
        }

        public static WorldGamificationReadSnapshotDto ParseSnapshot(string json)
        {
            try
            {
                var token = JToken.Parse(
                    json ?? string.Empty,
                    new JsonLoadSettings
                    {
                        DuplicatePropertyNameHandling = DuplicatePropertyNameHandling.Error,
                    });
                var root = RequireObject(token);
                RequireExactKeys(root,
                    "authority",
                    "region",
                    "resources",
                    "quests",
                    "whyEarned",
                    "collectionItems",
                    "ownedItemIds");

                var authority = RequireBoundedString(root["authority"], 80);
                if (authority != Authority) Invalid();

                var region = ParseRegion(RequireObject(root["region"]));
                var resources = ParseBalance(RequireObject(root["resources"]));

                var questsArray = RequireArray(root["quests"], 50);
                var quests = questsArray.Select(ParseQuest).ToArray();

                var whyEarned = ParseWhyEarned(RequireObject(root["whyEarned"]));

                var collectionArray = RequireArray(root["collectionItems"], 100);
                var collectionItems = collectionArray.Select(ParseCollectionItem).ToArray();

                var ownedArray = RequireArray(root["ownedItemIds"], 500);
                var ownedItemIds = ownedArray
                    .Select(item => RequireBoundedString(item, 160))
                    .ToArray();
                if (ownedItemIds.Distinct(StringComparer.Ordinal).Count() != ownedItemIds.Length)
                    Invalid();

                return new WorldGamificationReadSnapshotDto
                {
                    authority = Authority,
                    region = region,
                    resources = resources,
                    quests = quests,
                    whyEarned = whyEarned,
                    collectionItems = collectionItems,
                    ownedItemIds = ownedItemIds,
                };
            }
            catch (WorldGamificationClientException)
            {
                throw;
            }
            catch
            {
                throw new WorldGamificationClientException(WorldGamificationClientErrorCode.InvalidResponse);
            }
        }

        private static string NormalizeRequestedRegion(string regionCode)
        {
            if (string.IsNullOrWhiteSpace(regionCode)) return null;

            var normalized = regionCode.Trim().ToUpperInvariant();
            if (normalized != "GLOBAL" && !RegionCode.IsMatch(normalized))
                throw new WorldGamificationClientException(WorldGamificationClientErrorCode.InvalidRegion);

            return normalized;
        }

        private static WorldGamificationRegionDto ParseRegion(JObject value)
        {
            RequireExactKeys(value, "code", "identityName", "themeId");
            var code = RequireBoundedString(value["code"], 16).ToUpperInvariant();
            if (code != "GLOBAL" && !RegionCode.IsMatch(code)) Invalid();

            return new WorldGamificationRegionDto
            {
                code = code,
                identityName = RequireBoundedString(value["identityName"], 160),
                themeId = RequireBoundedString(value["themeId"], 160),
            };
        }

        private static WorldGamificationBalanceDto ParseBalance(JObject value)
        {
            RequireExactKeys(value, ResourceKeys);
            return new WorldGamificationBalanceDto
            {
                knowledgeFragments = RequireNonNegativeInteger(value["knowledgeFragments"]),
                localDiscoveries = RequireNonNegativeInteger(value["localDiscoveries"]),
                walkTraces = RequireNonNegativeInteger(value["walkTraces"]),
                communitySeeds = RequireNonNegativeInteger(value["communitySeeds"]),
                memoryThreads = RequireNonNegativeInteger(value["memoryThreads"]),
            };
        }

        private static WorldGamificationQuestDto ParseQuest(JToken token)
        {
            var value = RequireObject(token);
            RequireExactKeys(value,
                "id",
                "title",
                "category",
                "eventKind",
                "current",
                "target",
                "completed");

            var category = RequireBoundedString(value["category"], 32);
            var eventKind = RequireBoundedString(value["eventKind"], 100);
            if (!QuestCategories.Contains(category) || !EventKinds.Contains(eventKind)) Invalid();

            var current = RequireNonNegativeInteger(value["current"]);
            var target = RequirePositiveInteger(value["target"]);
            if (current > target || value["completed"]?.Type != JTokenType.Boolean) Invalid();

            return new WorldGamificationQuestDto
            {
                id = RequireBoundedString(value["id"], 160),
                title = RequireBoundedString(value["title"], 200),
                category = category,
                eventKind = eventKind,
                current = current,
                target = target,
                completed = value["completed"].Value<bool>(),
            };
        }

        private static WorldGamificationWhyEarnedDto ParseWhyEarned(JObject value)
        {
            RequireExactKeys(value, "authority", "items", "grossEarned");
            if (RequireBoundedString(value["authority"], 80) != Authority) Invalid();

            var items = RequireArray(value["items"], 100)
                .Select(ParseWhyEarnedItem)
                .ToArray();

            return new WorldGamificationWhyEarnedDto
            {
                authority = Authority,
                items = items,
                grossEarned = ParseBalance(RequireObject(value["grossEarned"])),
            };
        }

        private static WorldGamificationWhyEarnedItemDto ParseWhyEarnedItem(JToken token)
        {
            var value = RequireObject(token);
            RequireExactKeys(value, "eventId", "reasonCode", "grants", "recordedAt");

            var reasonCode = RequireBoundedString(value["reasonCode"], 80);
            if (!ReasonCodes.Contains(reasonCode)) Invalid();

            var recordedAt = RequireBoundedString(value["recordedAt"], 64);
            if (!DateTimeOffset.TryParse(
                    recordedAt,
                    CultureInfo.InvariantCulture,
                    DateTimeStyles.RoundtripKind,
                    out _))
                Invalid();

            return new WorldGamificationWhyEarnedItemDto
            {
                eventId = RequireBoundedString(value["eventId"], 160),
                reasonCode = reasonCode,
                grants = ParseGrant(RequireObject(value["grants"])),
                recordedAt = recordedAt,
            };
        }

        private static WorldGamificationGrantDto ParseGrant(JObject value)
        {
            if (!value.Properties().Any()) Invalid();

            foreach (var property in value.Properties())
            {
                if (!ResourceKeys.Contains(property.Name)) Invalid();
            }

            return new WorldGamificationGrantDto
            {
                knowledgeFragments = OptionalPositiveInteger(value, "knowledgeFragments"),
                localDiscoveries = OptionalPositiveInteger(value, "localDiscoveries"),
                walkTraces = OptionalPositiveInteger(value, "walkTraces"),
                communitySeeds = OptionalPositiveInteger(value, "communitySeeds"),
                memoryThreads = OptionalPositiveInteger(value, "memoryThreads"),
            };
        }

        private static WorldGamificationCollectionItemDto ParseCollectionItem(JToken token)
        {
            var value = RequireObject(token);
            RequireExactKeys(value, "id", "title", "owned", "affordable");
            if (value["owned"]?.Type != JTokenType.Boolean
                || value["affordable"]?.Type != JTokenType.Boolean)
                Invalid();

            return new WorldGamificationCollectionItemDto
            {
                id = RequireBoundedString(value["id"], 160),
                title = RequireBoundedString(value["title"], 200),
                owned = value["owned"].Value<bool>(),
                affordable = value["affordable"].Value<bool>(),
            };
        }

        private static long? OptionalPositiveInteger(JObject value, string key)
        {
            var token = value[key];
            return token == null ? null : RequirePositiveInteger(token);
        }

        private static JObject RequireObject(JToken token)
        {
            if (token is not JObject value) Invalid();
            return value;
        }

        private static JArray RequireArray(JToken token, int maxCount)
        {
            if (token is not JArray value || value.Count > maxCount) Invalid();
            return value;
        }

        private static string RequireBoundedString(JToken token, int maxLength)
        {
            if (token?.Type != JTokenType.String) Invalid();
            var value = token.Value<string>()?.Trim();
            if (string.IsNullOrEmpty(value) || value.Length > maxLength) Invalid();
            return value;
        }

        private static long RequireNonNegativeInteger(JToken token)
        {
            if (token?.Type != JTokenType.Integer) Invalid();
            var value = token.Value<long>();
            if (value < 0 || value > MaxSafeInteger) Invalid();
            return value;
        }

        private static long RequirePositiveInteger(JToken token)
        {
            var value = RequireNonNegativeInteger(token);
            if (value < 1) Invalid();
            return value;
        }

        private static void RequireExactKeys(JObject value, params string[] expected)
        {
            var expectedSet = new HashSet<string>(expected, StringComparer.Ordinal);
            var actual = value.Properties().Select(property => property.Name).ToArray();
            if (actual.Length != expectedSet.Count) Invalid();
            if (actual.Any(key => !expectedSet.Contains(key))) Invalid();
            if (expectedSet.Any(key => value.Property(key, StringComparison.Ordinal) == null)) Invalid();
        }

        private static void Invalid()
        {
            throw new WorldGamificationClientException(WorldGamificationClientErrorCode.InvalidResponse);
        }
    }
}
