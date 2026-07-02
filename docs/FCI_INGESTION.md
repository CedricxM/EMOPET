# Ingestion FCI locale

## Regle
Les races viennent uniquement de PDFs FCI locaux (ou CSV local controle). Aucun scraping.

## Dossier attendu
- PDFs: `data/fci/pdfs/`
- Ce dossier est ignore par git.

## Commande
```powershell
python scripts\ingest_fci_pdf.py --path data/fci/pdfs --lang fr
```

## Tables alimentees
- `breed_ref`
- `breed_docs`
- `breed_trait_ref`

## Champs extraits (best effort)
- numero FCI
- nom de race
- groupe + nom de groupe
- pays d'origine
- section
- ligne taille/hauteur si detectee
- texte comportement/caractere si detecte
- `fact` court dans `parsed_json`

## Note UX
L'UI affiche `group_name` (ex: Terriers), pas l'ID numerique brut.

