using System;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine.Networking;

namespace Emopet.World
{
    public sealed class UnityWebRequestWorldHttpTransport : IWorldHttpTransport
    {
        public async Task<WorldHttpResponse> SendAsync(
            string method,
            string absoluteUrl,
            string bearerToken,
            string jsonBody,
            CancellationToken cancellationToken)
        {
            using var request = new UnityWebRequest(absoluteUrl, method)
            {
                downloadHandler = new DownloadHandlerBuffer(),
            };

            if (!string.IsNullOrEmpty(jsonBody))
            {
                request.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(jsonBody));
                request.SetRequestHeader("Content-Type", "application/json");
            }

            request.SetRequestHeader("Authorization", $"Bearer {bearerToken}");
            request.SetRequestHeader("Accept", "application/json");

            cancellationToken.ThrowIfCancellationRequested();
            var operation = request.SendWebRequest();
            using var abortRegistration = cancellationToken.Register(request.Abort);
            await AwaitAsync(operation, cancellationToken);

            return new WorldHttpResponse(request.responseCode, request.downloadHandler?.text);
        }

        private static async Task AwaitAsync(
            UnityWebRequestAsyncOperation operation,
            CancellationToken cancellationToken)
        {
            if (operation.isDone)
                return;

            var completion = new TaskCompletionSource<bool>(
                TaskCreationOptions.RunContinuationsAsynchronously);

            operation.completed += _ => completion.TrySetResult(true);
            using var cancellationRegistration = cancellationToken.Register(
                () => completion.TrySetCanceled(cancellationToken));

            await completion.Task;
        }
    }
}
