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

            using var abortRegistration = cancellationToken.Register(request.Abort);
            var operation = request.SendWebRequest();
            await AwaitAsync(operation, cancellationToken);

            return new WorldHttpResponse(request.responseCode, request.downloadHandler?.text);
        }

        private static Task AwaitAsync(
            UnityWebRequestAsyncOperation operation,
            CancellationToken cancellationToken)
        {
            if (operation.isDone)
                return Task.CompletedTask;

            var completion = new TaskCompletionSource<bool>(
                TaskCreationOptions.RunContinuationsAsynchronously);

            operation.completed += _ => completion.TrySetResult(true);
            if (cancellationToken.CanBeCanceled)
                cancellationToken.Register(() => completion.TrySetCanceled(cancellationToken));

            return completion.Task;
        }
    }
}
