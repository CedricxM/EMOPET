using System;

namespace Emopet.World
{
    public sealed class WorldBackendException : Exception
    {
        public WorldBackendException(
            WorldErrorCode code,
            long statusCode,
            bool isStructuredWorldError = false)
            : base($"World backend rejected the request: {code} ({statusCode}).")
        {
            Code = code;
            StatusCode = statusCode;
            IsStructuredWorldError = isStructuredWorldError;
        }

        public WorldErrorCode Code { get; }
        public long StatusCode { get; }
        public bool IsStructuredWorldError { get; }
    }
}
