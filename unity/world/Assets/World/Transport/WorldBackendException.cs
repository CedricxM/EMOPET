using System;

namespace Emopet.World
{
    public sealed class WorldBackendException : Exception
    {
        public WorldBackendException(WorldErrorCode code, long statusCode)
            : base($"World backend rejected the request: {code} ({statusCode}).")
        {
            Code = code;
            StatusCode = statusCode;
        }

        public WorldErrorCode Code { get; }
        public long StatusCode { get; }
    }
}
