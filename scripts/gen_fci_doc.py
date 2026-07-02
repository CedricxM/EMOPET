"""Génère docs/FCI_BREEDS.md à partir de data/breed_profiles.json (référentiel FCI réel).
   Usage : python scripts/gen_fci_doc.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "breed_profiles.json")
OUT = os.path.join(ROOT, "docs", "FCI_BREEDS.md")

with open(SRC, encoding="utf-8") as f:
    breeds = json.load(f)

FCI_GROUPS = {
    1: "Chiens de berger et de bouvier (sauf bouviers suisses)",
    2: "Pinscher, schnauzer, molossoïdes, bouviers suisses",
    3: "Terriers",
    4: "Teckels",
    5: "Spitz et chiens de type primitif",
    6: "Chiens courants, chiens de recherche au sang",
    7: "Chiens d'arrêt",
    8: "Chiens rapporteurs, leveurs de gibier, chiens d'eau",
    9: "Chiens d'agrément et de compagnie",
    10: "Lévriers",
}
SIZE_FR = {"small": "petit", "medium": "moyen", "large": "grand", "giant": "très grand"}

def esc(s):
    return str(s or "").replace("|", "\\|")

# Stats
by_group = {}
brachy = 0
for b in breeds:
    g = b.get("fci_group")
    by_group[g] = by_group.get(g, 0) + 1
    if (b.get("morphology") or {}).get("is_brachycephalic"):
        brachy += 1

lines = []
lines.append("# EMOPET — Référentiel des races FCI")
lines.append("")
lines.append("> Généré depuis `data/breed_profiles.json` par `scripts/gen_fci_doc.py`. NE PAS éditer à la main.")
lines.append(f"> **{len(breeds)} races** de la nomenclature FCI (Fédération Cynologique Internationale).")
lines.append("")
lines.append("## À quoi sert ce référentiel")
lines.append("")
lines.append("Chaque race porte des **priors de population** utilisés par ELI v6 : seuils thermiques, "
             "besoins d'exercice, arousal de repos attendu (`a_rest`), et des modificateurs capteurs "
             "(qualité du signal selon le poil). Ces priors sont **provisoires** : la baseline par chien, "
             "calculée après la période de warm-up, les remplace. Ils servent aussi à l'UX (affichage, "
             "contexte de Breiz) et au veto V10 (race brachycéphale + chaleur).")
lines.append("")
lines.append("⚠ Non médical : aucune donnée de santé, aucun diagnostic. Tempérament = descripteurs FCI standard.")
lines.append("")
lines.append("## Schéma d'une entrée")
lines.append("")
lines.append("| Champ | Description |")
lines.append("|---|---|")
lines.append("| `fci_number` | Numéro de standard FCI |")
lines.append("| `breed_name_fr` / `breed_name_en` | Nom FR / EN |")
lines.append("| `fci_group` | Groupe FCI (1–10, voir légende) |")
lines.append("| `country_origin` | Pays d'origine |")
lines.append("| `morphology` | `size_class`, poids/taille min-max, `coat_type`, `fur_class`, `is_brachycephalic` |")
lines.append("| `temperament` | `descriptors[]`, `reactivity_hint` |")
lines.append("| `activity` | besoins d'activité |")
lines.append("| `sensor_modifiers` | ajustements fiabilité capteurs selon le poil/morphologie |")
lines.append("| `eli_priors` | priors de population pour ELI (remplacés par la baseline du chien) |")
lines.append("| `notes`, `profile_flags` | notes internes, drapeaux de profil |")
lines.append("")
lines.append("## Groupes FCI (répartition)")
lines.append("")
lines.append("| Groupe | Intitulé | Races |")
lines.append("|---|---|---|")
for g in sorted(k for k in by_group if k is not None):
    lines.append(f"| {g} | {FCI_GROUPS.get(g, '—')} | {by_group[g]} |")
lines.append(f"| — | **Total** | **{len(breeds)}** |")
lines.append("")
lines.append(f"Races brachycéphales (museau court, sensibles à la chaleur — veto V10) : **{brachy}**.")
lines.append("")
lines.append("## Catalogue complet (335 races)")
lines.append("")
lines.append("| # FCI | Race (FR) | Groupe | Origine | Gabarit | Poil | Brachy |")
lines.append("|---|---|---|---|---|---|---|")
for b in sorted(breeds, key=lambda x: (x.get("fci_group") or 99, x.get("fci_number") or 0)):
    m = b.get("morphology") or {}
    size = SIZE_FR.get(m.get("size_class"), m.get("size_class") or "—")
    coat = (m.get("coat_type") or "—").replace("_", " ")
    br = "oui" if m.get("is_brachycephalic") else ""
    lines.append(f"| {esc(b.get('fci_number'))} | {esc(b.get('breed_name_fr'))} | {esc(b.get('fci_group'))} | {esc(b.get('country_origin'))} | {size} | {esc(coat)} | {br} |")
lines.append("")

os.makedirs(os.path.join(ROOT, "docs"), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print(f"wrote {OUT} — {len(breeds)} breeds, {len(lines)} lines")
