namespace Emopet.World
{
    public enum WorldSessionState
    {
        SignedOut = 0,
        Bootstrapping = 1,
        ConnectedInvisible = 2,
        ConnectedVisible = 3,
        Degraded = 4,
        Revoked = 5,
        Disconnected = 6,
    }
}
