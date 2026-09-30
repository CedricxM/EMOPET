using System;
using System.Collections.Generic;

namespace Emopet.World
{
    public static class WorldPresets
    {
        public const string Salut = "salut";
        public const string ParIci = "par-ici";
        public const string Trouve = "trouve";
        public const string Pret = "pret";
        public const string Attends = "attends";
        public const string BienJoue = "bien-joue";
        public const string Merci = "merci";
        public const string JeQuitte = "je-quitte";
        public const string PasMaintenant = "pas-maintenant";

        private static readonly HashSet<string> Allowed = new HashSet<string>(StringComparer.Ordinal)
        {
            Salut, ParIci, Trouve, Pret, Attends, BienJoue, Merci, JeQuitte, PasMaintenant,
        };

        public static bool IsAllowed(string presetId) =>
            !string.IsNullOrWhiteSpace(presetId) && Allowed.Contains(presetId);
    }
}
