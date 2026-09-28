using System.Threading;
using System.Threading.Tasks;

namespace Emopet.World
{
    public readonly struct WorldHttpResponse
    {
        public WorldHttpResponse(long statusCode, string body)
        {
            StatusCode = statusCode;
            Body = body ?? string.Empty;
        }

        public long StatusCode { get; }
        public string Body { get; }
    }

    public interface IWorldHttpTransport
    {
        Task<WorldHttpResponse> SendAsync(
            string method,
            string absoluteUrl,
            string bearerToken,
            string jsonBody,
            CancellationToken cancellationToken);
    }
}
