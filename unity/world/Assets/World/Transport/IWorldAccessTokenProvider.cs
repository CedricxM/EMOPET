using System.Threading;
using System.Threading.Tasks;

namespace Emopet.World
{
    public interface IWorldAccessTokenProvider
    {
        Task<string> GetAccessTokenAsync(CancellationToken cancellationToken);
    }
}
