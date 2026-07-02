# EMOPET — Référentiel des races FCI

> Généré depuis `data/breed_profiles.json` par `scripts/gen_fci_doc.py`. NE PAS éditer à la main.
> **335 races** de la nomenclature FCI (Fédération Cynologique Internationale).

## À quoi sert ce référentiel

Chaque race porte des **priors de population** utilisés par ELI v6 : seuils thermiques, besoins d'exercice, arousal de repos attendu (`a_rest`), et des modificateurs capteurs (qualité du signal selon le poil). Ces priors sont **provisoires** : la baseline par chien, calculée après la période de warm-up, les remplace. Ils servent aussi à l'UX (affichage, contexte de Breiz) et au veto V10 (race brachycéphale + chaleur).

⚠ Non médical : aucune donnée de santé, aucun diagnostic. Tempérament = descripteurs FCI standard.

## Schéma d'une entrée

| Champ | Description |
|---|---|
| `fci_number` | Numéro de standard FCI |
| `breed_name_fr` / `breed_name_en` | Nom FR / EN |
| `fci_group` | Groupe FCI (1–10, voir légende) |
| `country_origin` | Pays d'origine |
| `morphology` | `size_class`, poids/taille min-max, `coat_type`, `fur_class`, `is_brachycephalic` |
| `temperament` | `descriptors[]`, `reactivity_hint` |
| `activity` | besoins d'activité |
| `sensor_modifiers` | ajustements fiabilité capteurs selon le poil/morphologie |
| `eli_priors` | priors de population pour ELI (remplacés par la baseline du chien) |
| `notes`, `profile_flags` | notes internes, drapeaux de profil |

## Groupes FCI (répartition)

| Groupe | Intitulé | Races |
|---|---|---|
| 1 | Chiens de berger et de bouvier (sauf bouviers suisses) | 40 |
| 2 | Pinscher, schnauzer, molossoïdes, bouviers suisses | 52 |
| 3 | Terriers | 34 |
| 4 | Teckels | 1 |
| 5 | Spitz et chiens de type primitif | 46 |
| 6 | Chiens courants, chiens de recherche au sang | 70 |
| 7 | Chiens d'arrêt | 36 |
| 8 | Chiens rapporteurs, leveurs de gibier, chiens d'eau | 20 |
| 9 | Chiens d'agrément et de compagnie | 23 |
| 10 | Lévriers | 13 |
| — | **Total** | **335** |

Races brachycéphales (museau court, sensibles à la chaleur — veto V10) : **10**.

## Catalogue complet (335 races)

| # FCI | Race (FR) | Groupe | Origine | Gabarit | Poil | Brachy |
|---|---|---|---|---|---|---|
| 15 | BERGER BELGE | 1 | Belgique | — | — |  |
| 16 | Chien de Berger Anglais Ancestral | 1 | Grande Bretagne | grand | double long |  |
| 38 | WELSH CORGI CARDIGAN | 1 | Grande Bretagne | petit | double short |  |
| 39 | WELSH CORGI PEMBROKE | 1 | Grande Bretagne | moyen | double long |  |
| 44 | BERGER DE BEAUCE | 1 |  | très grand | double short |  |
| 53 | KOMONDOR | 1 | Hongrie | très grand | double short |  |
| 54 | KUVASZ | 1 | Hongrie | — | wire |  |
| 55 | PULI | 1 | Hongrie | — | double short |  |
| 56 | PUMI | 1 | Hongrie | — | wire |  |
| 83 | SCHIPPERKE | 1 | Belgique | — | — |  |
| 88 | Chien de Berger des Shetland | 1 | Grande Bretagne | — | double short |  |
| 93 | Chien de Berger de la Serra de Aires | 1 | Portugal | — | wire |  |
| 113 | BERGER DE BRIE | 1 | France | grand | double long |  |
| 138 | CHIEN DE BERGER DES PYRENEES A FACE RASE | 1 | France | moyen | smooth |  |
| 141 | Pyrenean Sheepdog Long-Haired | 1 |  | — | — |  |
| 142 | Tchouvatch Slovaque | 1 | République slovaque | — | — |  |
| 156 | Collie à poil long | 1 | Grande Bretagne | — | double short |  |
| 166 | Berger allemand | 1 | Allemagne | grand | — |  |
| 171 | BOUVIER DES ARDENNES | 1 | Belgique | — | short |  |
| 176 | Berger Picard | 1 | France | — | double long |  |
| 191 | BOUVIER DES FLANDRES | 1 | Belgique-France | — | smooth |  |
| 194 | Berger bergamasque | 1 | Italie | — | double short |  |
| 201 | Berger des Abruzzes et de la Maremme | 1 | Italie | — | long |  |
| 223 | Berger Hollandais | 1 | Pays-Bas | — | double short |  |
| 238 | MUDI | 1 |  | — | double short |  |
| 251 | Berger Polonais de Plaine | 1 | Pologne | moyen | — |  |
| 252 | Polish Tatra Shepherd | 1 |  | très grand | double short |  |
| 271 | Collie barbu | 1 | Grande Bretagne | — | double short |  |
| 277 | Chien berger croate | 1 | Croatie | — | — |  |
| 287 | Bouvier Australien | 1 | Australie | — | double short |  |
| 293 | Kelpie Australien | 1 | Australie | — | — |  |
| 296 | Collie à poil court | 1 | Grande Bretagne | — | double short |  |
| 297 | BORDER COLLIE | 1 | Grande Bretagne | moyen | double short |  |
| 311 | Chien-Loup de Saarloos | 1 | Pays-Bas | — | — |  |
| 313 | Schapendoes Néerlandais | 1 | Pays-Bas | — | smooth |  |
| 326 | Berger de Russie méridionale | 1 | Russie | — | — |  |
| 332 | Chien Loup Tchécoslovaque | 1 | Ancienne République Tchécoslovaque | — | — |  |
| 347 | BERGER BLANC SUISSE | 1 | Suisse | — | double short |  |
| 349 | Ciob ănesc Românesc Mioritic | 1 | Roumanie | — | double short |  |
| 350 | Chien de berger roumain des Carpathes – « Carpatin » | 1 | Roumanie | — | — |  |
| 41 | Chien de Berger Yougoslave de Charplanina | 2 | Serbie/Macédoine | très grand | — |  |
| 45 | Bouvier Bernois | 2 | Suisse | — | smooth |  |
| 46 | Bouvier de L’Appenzell | 2 | Suisse | — | smooth |  |
| 47 | Bouvier de L’Entlebuch | 2 | Suisse | — | — |  |
| 50 | Chien de Terre-Neuve | 2 | Canada | — | double short |  |
| 58 | Grand Bouvier Suisse | 2 | Suisse | — | double short |  |
| 61 | (Chien du Mont Saint-Bernard – | 2 | Suisse | — | — |  |
| 64 | Pinscher Autrichien | 2 | Autriche | moyen | double short |  |
| 91 | Matin Espagnol | 2 | Espagne | — | — |  |
| 92 | Matin des Pyrenées | 2 | Espagne | — | long |  |
| 96 | Rafeiro de l’Alentejo | 2 | Portugal | — | — |  |
| 116 | DOGUE DE BORDEAUX | 2 | France | — | long | oui |
| 137 | CHIEN DE MONTAGNE DES PYRENEES | 2 | France | — | — |  |
| 143 | DOBERMANN | 2 | Allemagne | — | — |  |
| 144 | Boxer | 2 | Allemagne | — | long | oui |
| 145 | Chien de Leonberg | 2 | Allemagne | — | — |  |
| 147 | ROTTWEILER | 2 | Allemagne | — | — |  |
| 149 | BULLDOG | 2 | Grande-Bretagne | — | — | oui |
| 157 | BULLMASTIFF | 2 | Grande-Bretagne | très grand | short |  |
| 170 | Chien de Castro Laboreiro | 2 | Portugal | — | — |  |
| 173 | Chien de la Serra da Estrela | 2 | Portugal | — | wire |  |
| 181 | Schnauzer Geant | 2 | Allemagne | — | double short |  |
| 182 | SCHNAUZER | 2 | Allemagne | — | — |  |
| 184 | Pinscher Allemand | 2 | Allemagne | — | smooth |  |
| 185 | Pinscher Nain | 2 | Allemagne | — | smooth |  |
| 186 | AFFENPINSCHER | 2 | Allemagne | grand | wire |  |
| 190 | HOVAWART | 2 |  | — | double short |  |
| 197 | Matin Napolitain | 2 | Italie | — | — |  |
| 225 | FILA BRASILEIRO | 2 | Brésil | — | — |  |
| 226 | Type continental-européen | 2 | Allemagne/ Suisse | très grand | double short |  |
| 230 | Dogue du Tibet | 2 | Tibet (Chine) | — | — |  |
| 235 | Dogue Allemand | 2 | Allemagne | — | long |  |
| 247 | AÏDI | 2 | Maroc | — | smooth |  |
| 249 | Dogue de Majorque | 2 | Espagne | — | — |  |
| 260 | T O S A | 2 | Japon | grand | double short |  |
| 264 | MASTIFF | 2 | Grande Bretagne | — | — |  |
| 278 | Berger du Karst | 2 | Slovénie | toy_small | — |  |
| 292 | Dogue Argentin | 2 | République d’Argentine | — | — |  |
| 308 | Smous des Pays-Bas | 2 | Pays-Bas | — | double short |  |
| 309 | SHAR-PEI | 2 | Chine | moyen | short | oui |
| 315 | BROHOLMER | 2 | Danemark | très grand | double short |  |
| 327 | Terrier Noir Russe | 2 | Russie | — | long |  |
| 328 | Berger Du Caucase | 2 | URSS | — | short |  |
| 331 | Chien de Berger Kangal | 2 | Turquie | — | — |  |
| 335 | Berger d’Asie Centrale | 2 | URSS (Régions d’Asie Centrale) | — | — |  |
| 340 | Fila de Saint Miguel | 2 | Portugal | grand | double short |  |
| 343 | Chien de cour italien | 2 | Italie | très grand | double short |  |
| 346 | PRESA CANARIO | 2 | Espagne | grand | — |  |
| 353 | Cimarron Uruguayen | 2 | Uruguay | très grand | smooth |  |
| 355 | Berger de Bosnie-Herzégovine et de Croatie | 2 | Bosnie-Herzégovine – Croatie | — | double short |  |
| 356 | Chien de ferme dano-suédois | 2 | Danemark et Suède | petit | smooth |  |
| 357 | Chien de berger Roumain de Bucovine | 2 | Roumanie | toy_small | — |  |
| 3 | TERRIER KERRY BLUE | 3 | Irlande | moyen | wire |  |
| 4 | CAIRN TERRIER | 3 | Grande Bretagne | — | double short |  |
| 7 | AIREDALE TERRIER | 3 | Grande Bretagne | grand | double short |  |
| 8 | Terrier australien | 3 | Australie | petit | double short |  |
| 9 | Terrier de Bedlington | 3 | Grande Bretagne | moyen | wire |  |
| 10 | BORDER TERRIER | 3 | Grande Bretagne | — | wire |  |
| 11 | BULL TERRIER | 3 | Grande Bretagne | — | short |  |
| 12 | SMOOTH | 3 | Grande Bretagne | petit | double short |  |
| 13 | TERRIER D'AGREMENT ANGLAIS NOIR ET FEU | 3 | Grande Bretagne | toy | double short |  |
| 40 | Terrier irlandais à poil doux | 3 | Irlande | moyen | double short |  |
| 70 | LAKELAND TERRIER | 3 | Grande Bretagne | petit | wire |  |
| 71 | Terrier de Manchester | 3 | Grande Bretagne | moyen | smooth |  |
| 72 | NORWICH TERRIER | 3 | Grande Bretagne | toy | double long |  |
| 73 | Terrier Ecossais | 3 | Grande-Bretagne | grand | double short |  |
| 74 | SEALYHAM TERRIER | 3 | Grande Bretagne | petit | long |  |
| 75 | SKYE TERRIER | 3 | Grande Bretagne | toy | double short |  |
| 76 | STAFFORDSHIRE BULL TERRIER | 3 | Grande Bretagne | moyen | smooth |  |
| 78 | WELSH TERRIER | 3 | Grande Bretagne | petit | wire |  |
| 85 | WEST HIGHLAND WHITE TERRIER | 3 | Grande Bretagne | petit | — |  |
| 86 | Terrier du Yorkshire | 3 | Grande Bretagne | — | long |  |
| 103 | Terrier de chasse allemand | 3 | Allemagne | — | — |  |
| 139 | Terrier Irlandais | 3 | Irlande | — | double long |  |
| 168 | DANDIE DINMONT TERRIER | 3 | Grande-Bretagne | toy_small | double long |  |
| 169 | Fox Terrier à poil dur | 3 | Grande-Bretagne | petit | double short |  |
| 236 | Terrier australien à poil soyeux | 3 | Australie | grand | long |  |
| 246 | Terrier Tchèque | 3 | République tchèque | toy_small | double short |  |
| 259 | Terrier japonais | 3 | Japon | — | double short |  |
| 272 | NORFOLK TERRIER | 3 | Grande Bretagne | toy | smooth |  |
| 286 | Staffordshire Terrier Americain | 3 | U.S.A | moyen | short |  |
| 302 | Terrier Irlandais Glen of Imaal | 3 | Irlande | moyen | double long |  |
| 339 | Terrier du Révérend Russell | 3 | Grande-Bretagne | petit | double short |  |
| 341 | Terrier Brésilien | 3 | Brésil | — | smooth |  |
| 345 | Terrier Jack Russell | 3 | Angleterre | petit | smooth |  |
| 359 | Bull Terrier Miniature | 3 | Grande Bretagne | petit | short |  |
| 148 | Teckel | 4 | Allemagne | — | — |  |
| 14 | VÄSTGÖTASPETS | 5 | Suède | petit | double long |  |
| 42 | Chien d’élan suédois | 5 | Suède | grand | short |  |
| 43 | BASENJI | 5 | Afrique Centrale | moyen | short |  |
| 48 | Chien d’ours de Carelie | 5 | Finlande | grand | double short |  |
| 49 | Spitz Finlandais | 5 | Finlande | — | — |  |
| 89 | Podenco d’Ibiza | 5 | Espagne (Baléares) | — | smooth |  |
| 94 | Chien de Garenne Portugais | 5 | Portugal | — | double short |  |
| 97 | Spitz allemands | 5 | Allemagne | — | — |  |
| 135 | Lapphund Suedois | 5 | Suède | moyen | double short |  |
| 189 | Chien Finnois de Laponie | 5 | Finlande | moyen | double short |  |
| 195 | Italian Volpino | 5 |  | — | — |  |
| 199 | Cirneco de l’Etna | 5 | Italie | — | long |  |
| 205 | CHOW-CHOW | 5 | Chine | grand | double short |  |
| 211 | Chien esquimau canadien | 5 | Canada | — | double short |  |
| 212 | Samoyede | 5 | Russie septentrionale et Sibérie | — | double short |  |
| 234 | Variété sans poil & Variété avec poils | 5 | Mexique. Langue faisant foi : (ES) | — | long |  |
| 237 | Buhund Norvegien | 5 | Norvège | moyen | double short |  |
| 242 | Norsk Elghund Grå | 5 | Norvège | moyen | double short |  |
| 243 | Malamute de l’Alaska | 5 | U.S.A | — | — |  |
| 248 | Chien du Pharaon | 5 | Malte | grand | double short |  |
| 255 | AKITA | 5 | Japon | grand | double long |  |
| 257 | SHIBA | 5 | Japon | — | double long |  |
| 261 | HOKKAIDO | 5 | Japon | moyen | double long |  |
| 262 | Spitz Japonais | 5 | Japon | petit | double short |  |
| 265 | Chien Norvégien de Macareux | 5 | Norvège | petit | double short |  |
| 268 | Chien d’Elan Norvegien Noir | 5 | Norvège | moyen | double short |  |
| 270 | Husky de Sibérie | 5 | États-Unis | — | — |  |
| 273 | Chien de Canaan | 5 | Israël | très grand | double short |  |
| 274 | Chien du Groenland | 5 | Groenland | grand | double short |  |
| 276 | Spitz de Norrbotten | 5 | Suède | — | double short |  |
| 284 | Berger Finnois de Laponie | 5 | Finlande | moyen | double long |  |
| 289 | Chien de Berger Islandais | 5 | Islande | — | double short |  |
| 291 | EURASIER | 5 | Allemagne | — | double short |  |
| 304 | Laika Russo-Européen | 5 | Russie | — | double short |  |
| 305 | Laika de Siberie Orientale | 5 | Russie | — | long |  |
| 306 | Laika de Siberie Occidentale | 5 | Russie | — | — |  |
| 310 | Chien nu du Pérou | 5 | Pérou | — | — |  |
| 317 | KAI | 5 | Japon | moyen | double long |  |
| 318 | KISHU | 5 | Japon | moyen | double long |  |
| 319 | SHIKOKU | 5 | Japon | moyen | double long |  |
| 329 | Chien de Garenne des Canaries | 5 | Espagne | grand | smooth |  |
| 334 | Jindo Coreen | 5 | Corée | moyen | — |  |
| 338 | Chien Thaïlandais à crête dorsale | 5 | Thaïlande | grand | smooth |  |
| 344 | Akita Americain | 5 | Japon | — | — |  |
| 348 | Chien de Taiwan | 5 | Taïwan | moyen | double short |  |
| 358 | Bangkaew de Thaïlande | 5 | Thaïlande | grand | double short |  |
| 17 | GRIFFON NIVERNAIS | 6 | France | — | — |  |
| 19 | BRIQUET GRIFFON VENDEEN | 6 | France | grand | double long |  |
| 20 | ARIEGEOIS | 6 | France | grand | short |  |
| 21 | GASCON SAINTONGEOIS | 6 | France | — | — |  |
| 22 | GRAND BLEU DE GASCOGNE | 6 | France | très grand | smooth |  |
| 24 | POITEVIN | 6 | France | très grand | short |  |
| 25 | BILLY | 6 | France | très grand | smooth |  |
| 28 | CHIEN D’ARTOIS | 6 | France | très grand | double short |  |
| 30 | PORCELAINE | 6 | France | grand | smooth |  |
| 31 | PETIT BLEU DE GASCOGNE | 6 | France | grand | short |  |
| 32 | GRIFFON BLEU DE GASCOGNE | 6 | France | grand | short |  |
| 33 | GRAND BASSET GRIFFON VENDEEN | 6 | France | moyen | double long |  |
| 34 | BASSET ARTESIEN NORMAND | 6 | France | — | — |  |
| 35 | BASSET BLEU DE GASCOGNE | 6 | France | petit | short |  |
| 36 | BASSET FAUVE DE BRETAGNE | 6 | France | petit | smooth |  |
| 51 | Chien Courant Finlandais | 6 | Finlande | — | — |  |
| 52 | Brachet Polonais | 6 | Pologne | — | — |  |
| 59 | CHIEN COURANT SUISSE | 6 | Suisse | — | — |  |
| 60 | Petit Chien Courant Suisse | 6 | Suisse | — | — |  |
| 62 | Brachet de Styrie à poil dur | 6 | Autriche | moyen | short |  |
| 63 | VIERÄUGL | 6 | Autriche | grand | double short |  |
| 66 | GRIFFON FAUVE DE BRETAGNE | 6 | France | moyen | smooth |  |
| 67 | PETIT BASSET GRIFFON VENDEEN | 6 | France | petit | double long |  |
| 68 | Brachet Tyrolien | 6 | Autriche | moyen | — |  |
| 84 | Bloodhound | 6 | Belgique | — | — |  |
| 100 | Basset de Westphalie | 6 | Allemagne | — | short |  |
| 129 | Chien Courant du Småland | 6 | Suède | moyen | double short |  |
| 130 | Basset Suédois | 6 | Suède | petit | short |  |
| 131 | Chien Courant de Schiller | 6 | Suède | grand | smooth |  |
| 132 | Chien Courant de Hamilton | 6 | Suède | grand | smooth |  |
| 146 | RHODESIAN RIDGEBACK | 6 | Sud de l’Afrique | grand | double short |  |
| 150 | Chien Courant Serbe | 6 | Serbie | — | — |  |
| 151 | Chien courant d’Istrie à poil ras | 6 | Croatie | — | — |  |
| 152 | Chien courant d’Istrie à poil dur | 6 | Croatie | — | double short |  |
| 153 | Dalmatien | 6 | Croatie | — | — |  |
| 154 | Chien courant de la Vallée de la Save | 6 | Croatie | — | smooth |  |
| 155 | Chien Courant de Bosnie à poil raide dit « Barak » | 6 | Bosnie | moyen | double long |  |
| 159 | Foxhound Anglais | 6 | Grande Bretagne | grand | double short |  |
| 161 | BEAGLE | 6 | Grande Bretagne | moyen | double short |  |
| 163 | BASSET HOUND | 6 | Grande Bretagne | — | — |  |
| 198 | Chien courant italien à poil dur | 6 | Italie | — | — |  |
| 203 | Chien Courant Norvégien | 6 | Norvège | — | double short |  |
| 204 | Chien Courant Espagnol | 6 | Espagne | — | — |  |
| 213 | Chien de recherche au sang de Hanovre | 6 | Allemagne | — | — |  |
| 214 | Chien Courant Grec | 6 | Grèce | moyen | double short |  |
| 217 | Chien de rouge de Bavière | 6 | Allemagne | — | — |  |
| 219 | FRANÇAIS TRICOLORE | 6 | France | très grand | smooth |  |
| 220 | FRANÇAIS BLANC ET NOIR | 6 | France | très grand | smooth |  |
| 229 | Chien Courant Tricolore Serbe | 6 | Serbie | — | double short |  |
| 241 | Chien Courant de Transylvanie | 6 | Hongrie | — | — |  |
| 244 | Chien Courant Slovaque | 6 | Slovaquie | moyen | double long |  |
| 254 | Basset des Alpes | 6 | Autriche | moyen | — |  |
| 266 | Chien Courant de Hygen | 6 | Norvège | grand | double short |  |
| 267 | Chien Courant de Halden | 6 | Norvège | grand | — |  |
| 275 | Pisteur brésilien | 6 | Brésil | — | — |  |
| 279 | Chien Courant de Montagne du Monténégro | 6 | République du Monténégro | moyen | double short |  |
| 282 | GRAND GRIFFON VENDEEN | 6 | France | grand | long |  |
| 290 | BEAGLE-HARRIER | 6 | France | moyen | double short |  |
| 294 | Chien à Loutre | 6 | Grande-Bretagne | — | double long |  |
| 295 | HARRIER | 6 | Grande Bretagne | grand | smooth |  |
| 299 | Brachet Allemand | 6 | Allemagne | moyen | double short |  |
| 300 | Chien Noir et Feu pour la chasse au raton laveur | 6 | USA | grand | short |  |
| 303 | American Foxhound | 6 | U.S.A | grand | long |  |
| 316 | FRANÇAIS BLANC ET ORANGE | 6 | France | très grand | smooth |  |
| 322 | GRAND ANGLO-FRANÇAIS TRICOLORE | 6 | France | très grand | short |  |
| 323 | GRAND ANGLO-FRANÇAIS BLANC ET NOIR | 6 | France | très grand | smooth |  |
| 324 | GRAND ANGLO-FRANCAIS BLANC ET ORANGE | 6 | France | très grand | smooth |  |
| 325 | ANGLO-FRANCAIS DE PETITE VENERIE | 6 | France | moyen | smooth |  |
| 337 | Chien Courant Italien à Poil Ras | 6 | Italie | — | — |  |
| 354 | Chien Courant Polonais | 6 | Pologne | — | double short |  |
| 1 | Pointer Anglais | 7 | Grande-Bretagne | grand | smooth |  |
| 2 | Setter Anglais | 7 | Grande-Bretagne | grand | smooth |  |
| 6 | Setter Gordon | 7 | Grande-Bretagne | grand | short |  |
| 57 | Braque Hongrois à Poil Court (Vizsla) | 7 | Hongrie | — | — |  |
| 90 | PERDIGUERO DE BURGOS | 7 | Espagne | — | — |  |
| 95 | EPAGNEUL BRETON | 7 | France | — | — |  |
| 98 | Deutsch Drahthaar | 7 | Allemagne | — | double long |  |
| 99 | Braque de Weimar | 7 | Allemagne | — | — |  |
| 102 | Petit Epagneul De Münster | 7 | Allemagne | — | — |  |
| 106 | EPAGNEUL BLEU DE PICARDIE | 7 | France | — | long |  |
| 107 | GRIFFON A POIL DUR KORTHALS | 7 | France | grand | wire |  |
| 108 | EPAGNEUL PICARD | 7 | France | — | — |  |
| 114 | EPAGNEUL DE PONT-AUDEMER | 7 | France | grand | curly |  |
| 115 | BRAQUE SAINT GERMAIN | 7 | France | grand | short |  |
| 117 | Chien d’Arrêt Allemand à Poil Long | 7 | Allemagne | très grand | double short |  |
| 118 | Grand Epagneul de Münster | 7 | Allemagne | très grand | double short |  |
| 119 | Braque Allemand à Poil Court | 7 | Allemagne | — | short |  |
| 120 | Setter Irlandais Rouge | 7 | Irlande | grand | short |  |
| 133 | DATE DE PUBLICATION DU STANDARD OFFICIEL EN | 7 | France | grand | — |  |
| 134 | DATE DE PUBLICATION DU STANDARD OFFICIEL EN | 7 | France | grand | short |  |
| 165 | Spinone | 7 | Italie | — | — |  |
| 175 | EPAGNEUL FRANCAIS | 7 | France | — | smooth |  |
| 177 | BRAQUE DE L’ARIEGE | 7 | France | grand | smooth |  |
| 179 | province du Bourbonnais | 7 | France (province du Bourbonnais) | — | double short |  |
| 180 | BRAQUE D’AUVERGNE | 7 | France | toy_small | short |  |
| 187 | Chien d’Arrêt Portugais | 7 | Portugal | — | — |  |
| 202 | Braque italien | 7 | Italie | toy_small | — |  |
| 216 | PUDELPOINTER | 7 | Allemagne | — | double long |  |
| 222 | Chien d’arrêt Frison | 7 | Pays-Bas | — | — |  |
| 224 | Chien de perdrix de Drente | 7 | Pays-Bas | — | smooth |  |
| 232 | Chien d’Arrêt Allemand à Poil Raide | 7 | Allemagne | — | double short |  |
| 239 | Braque Hongrois à Poil Dur (Vizsla | 7 | Hongrie | — | short |  |
| 245 | Barbu Tchèque | 7 | Anciennement Tchécoslovaquie, aujourd’hui | — | double short |  |
| 281 | Chien d’Arrêt Danois Ancestral | 7 | Danemark | — | — |  |
| 320 | Braque Slovaque à Poil Dur | 7 | Slovaquie | grand | double short |  |
| 330 | Setter Irlandais Rouge et Blanc | 7 | Irlande | grand | short |  |
| 5 | Cocker Spaniel Anglais | 8 | Grande Bretagne | grand | curly |  |
| 37 | Chien d’eau Portugais | 8 | Portugal | — | wire |  |
| 104 | Chien d’Oysel Allemand | 8 | Allemagne | — | long |  |
| 105 | BARBET | 8 | France | grand | long |  |
| 109 | CLUMBER SPANIEL | 8 | Grande-Bretagne | — | — |  |
| 110 | Retriever à poil bouclé | 8 | Grande Bretagne | grand | double short |  |
| 111 | GOLDEN RETRIEVER | 8 | Grande Bretagne | grand | — |  |
| 121 | Retriever à poil plat | 8 | Grande Bretagne | grand | — |  |
| 122 | Retriever du Labrador | 8 | Grande Bretagne | grand | double short |  |
| 123 | FIELD SPANIEL | 8 | Grande Bretagne | grand | double short |  |
| 124 | Epagneul d’Eau Irlandais | 8 | Irlande | grand | double short |  |
| 125 | ENGLISH SPRINGER SPANIEL | 8 | Grande Bretagne | moyen | — |  |
| 126 | WELSH SPRINGER SPANIEL | 8 | Grande Bretagne | moyen | wire |  |
| 127 | SUSSEX SPANIEL | 8 | Grande Bretagne | grand | — |  |
| 167 | Cocker Américain | 8 | États-Unis | — | double short |  |
| 221 | WETTERHOUN | 8 |  | grand | double short |  |
| 298 | Chien d’eau romagnol | 8 | Italie | — | long |  |
| 301 | Chien d’Eau Américain | 8 | U.S.A | moyen | smooth |  |
| 312 | Retriever de la Nouvelle Ecosse | 8 | Canada | toy_small | double long |  |
| 336 | Chien d’eau espagnol | 8 | Espagne | moyen | short |  |
| 65 | MALTESE | 9 |  | — | — |  |
| 77 | EPAGNEUL NAIN CONTINENTAL | 9 | France et Belgique | — | double short |  |
| 80 | GRIFFON BRUXELLOIS | 9 |  | — | double short | oui |
| 101 | BOULEDOGUE FRANCAIS | 9 | France | — | — | oui |
| 128 | Epagneul King Charles | 9 | Grande Bretagne | — | double long | oui |
| 136 | CAVALIER KING CHARLES SPANIEL | 9 | Grande-Bretagne | — | double long |  |
| 140 | Terrier de Boston | 9 | U.S.A | — | smooth |  |
| 172 | Poodle | 9 |  | — | — |  |
| 192 | KROMFOHRLÄNDER | 9 | Allemagne | — | double short |  |
| 196 | BOLOGNESE | 9 |  | — | short |  |
| 206 | Epagneul Japonais | 9 | Japon | — | double short | oui |
| 207 | Pékinois | 9 | Chine | petit | double long | oui |
| 208 | Chine | 9 | Tibet (Chine) | petit | double long |  |
| 209 | Tibetan Terrier | 9 | Tibet (Chine) | moyen | double long |  |
| 215 | BICHON A POIL FRISE | 9 | Franco-belge | — | — |  |
| 218 | Chihuahua | 9 | Mexique | — | double short |  |
| 227 | China | 9 |  | toy | double long |  |
| 233 | LITTLE LION DOG | 9 |  | grand | double short |  |
| 250 | BICHON HAVANAIS | 9 | Cuba | petit | long |  |
| 253 | Carlin | 9 | Chine | — | smooth | oui |
| 283 | COTON DE TULEAR | 9 |  | petit | wire |  |
| 288 | Chien Chinois à Crète | 9 | Chine | petit | long |  |
| 352 | Petit Chien Russe | 9 | Russie | — | smooth |  |
| 158 | Lévrier Anglais | 10 | Grande-Bretagne | très grand | — |  |
| 160 | Lévrier Irlandais | 10 | Irlande | très grand | wire |  |
| 162 | WHIPPET | 10 | Grande-Bretagne | moyen | short |  |
| 164 | DEERHOUND | 10 | Grande-Bretagne | très grand | double long |  |
| 188 | SLOUGHI | 10 | Maroc | très grand | smooth |  |
| 193 | Barzoï - Lévrier de chasse russe | 10 | Russie | — | long |  |
| 200 | Petit Lévrier italien – Levrette d’Italie | 10 | Italie | — | — |  |
| 228 | Lévrier Afghan | 10 | Afghanistan | très grand | short |  |
| 240 | Lévrier hongrois | 10 | Hongrie | très grand | short |  |
| 269 | SALUKI | 10 | Moyen-Orient /Patronage FCI | petit | smooth |  |
| 285 | Galgo espagnol | 10 | Espagne | — | wire |  |
| 307 | AZAWAKH | 10 | Confins nord du Mali et du Niger ; les versants de la | — | smooth |  |
| 333 | Lévrier polonais | 10 | Pologne | — | — |  |
