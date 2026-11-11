# Rapport de validation — version complète 2.5.0

Validation du 11 novembre 2026 dans l’environnement Linux cloud, Node.js 24.22.1 et Chromium. Base de travail : version GitHub 2.4.0 (`35b303be709104b9179cf89c5eb5bce79f0441b6`) et ajustements ergonomiques 2.4.1 déjà préparés, intégrés à cette livraison unique. Aucun déploiement sur le PC du cabinet et aucune publication GitHub de cette version n’ont été effectués.

## Résultats exécutés

| Commande | Résultat et portée |
| --- | --- |
| `npm test` | 22 tests réussis, 0 échec, 0 ignoré : domaine, serveur, conservation, export/corbeille, bilans |
| `node tests/private-browser.mjs` | Réussi : parcours existants, comptes isolés, synchronisation, statuts Titan, audit, panne réseau, saisie conservée et affichage mobile |
| `node tests/bulk-browser.mjs` | Réussi : sélection dans l’historique, filtre, téléchargement Excel, refus de confirmation, corbeille et restauration |
| `node tests/ergonomics-browser.mjs` | Réussi : ordinateur et iPhone 13 simulé, trois rôles, couleurs calculées, compteurs et tri interne des groupes, désactivation du regroupement, filtres, dates neutres de l’historique, absence d’outils groupés dans les attentes, aucune écriture dans l’état existant |
| `node tests/assessments-browser.mjs` | Réussi : bilan initial, MRC/TUG, champs articulaires structurés, correction manuelle non écrasée, brouillon retrouvé après rechargement, validations explicites, finalisation immuable, PDF téléchargé et lien de prévisualisation, réévaluation, comparaison chiffrée, largeur mobile et état des transmissions conservé |
| `node --check` et `git diff --check` | Réussis pour les modules vérifiés et les différences du dépôt |

Dans l’environnement utilisé, les quatre commandes navigateur ont le préfixe `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs`. Chromium est `/usr/bin/chromium`. Les suites créent uniquement des comptes fictifs et bases temporaires ; elles n’utilisent jamais les données persistantes du cabinet.

## Vérifications des bilans

Les tests couvrent les bornes MRC et les entiers attendus, le Tinetti complet 16+12=28, le refus d’un item manquant à la finalisation ou hors bornes, les brouillons incomplets, l’absence de scores sur les tests non effectués, les neuf modèles de constats et de projets, la règle conservative de contre-indication, les écarts chiffrés et les changements de conditions de mesure.

Les contrôles API couvrent authentification, CSRF, secrétariat non rédacteur, brouillons privés et accès administratrice, conflits de révision, validation par compte/date serveur, invalidation après changement clinique, immutabilité après finalisation, refus d’export de brouillon, création de réévaluation sans reprise fictive des scores, audit sans contenu clinique, sauvegarde SQLite contenant les bilans et conservation des comptes/résidents/modèles/transmissions. Les règles existantes de suppression, d’audit et de conservation des transmissions restent testées.

## PDF

Des PDF fictifs d’une et de plusieurs pages ont été produits et vérifiés par `pdfinfo`. `pdftotext` vérifie le texte, la pagination, les accents et les symboles grecs testés (α, β) ainsi que le degré. Les longs tableaux comparatifs sont également générés et analysés. Un PDF fictif a été rendu en image avec `pdftoppm` et inspecté visuellement après ajout des polices embarquées. Les pages sont en A4 portrait, les textes reviennent à la ligne selon les métriques de la police et les longues cellules se poursuivent sur la page suivante.

Les 22 tests ont également été exécutés sur une extraction indépendante de l’archive de livraison.

Aucun service distant ni dépendance npm de production n’est introduit. Les polices DejaVu non modifiées sont livrées avec leur licence. Un glyphe absent de ces polices bloque l’export plutôt que de masquer la donnée.

## Fichiers modifiés ou ajoutés depuis 2.4.0

Application :

- `index.html` — références de cache 2.5.0.
- `package.json` — version unique 2.5.0 et ajout des tests serveur/métier de bilans.
- `src/app.js` — ergonomie des transmissions, groupes colorés, nouvelle navigation indépendante.
- `src/style.css` — fonds de groupes et styles du module.
- `src/assessments.js` — formulaires, brouillons, validations, réévaluation, comparaison et téléchargement/prévisualisation.
- `src/assessments-domain.js` — schéma clinique, tests, calculs, modèles déterministes et comparaisons.
- `backend/server.js` — intégration des routes authentifiées et des modules statiques autorisés.
- `backend/assessments.js` — nouvelle table, droits, conflits, validations, finalisation, audit et export.
- `backend/assessment-pdf.js` — document local A4, sections, tableaux et pagination.
- `backend/pdf-font.js` — polices embarquées, métriques et correspondance Unicode.
- `assets/fonts/DejaVuSans.ttf`, `assets/fonts/DejaVuSans-Bold.ttf`, `assets/fonts/LICENSE.txt` — fontes et licence.

Tests :

- `tests/bulk-browser.mjs` — opérations groupées exercées dans l’historique.
- `tests/ergonomics-browser.mjs` — ordinateur/mobile, trois rôles et présentation des deux listes.
- `tests/assessments.test.js` — moteur, API, droits, conservation, sauvegarde et PDF.
- `tests/assessments-browser.mjs` — parcours complet fictif des bilans.

Documentation :

- `README.md` — accès à la livraison unique et aux guides.
- `docs/BILANS-RESIDENTS.md` — fonctionnement, droits, modèles, protocoles et limites.
- `docs/MISE-A-JOUR-2.5.0.md` — installation directe, sauvegarde et retour arrière.
- `docs/VALIDATION-2.5.0.md` — présent rapport.
- `docs/MISE-A-JOUR-2.4.1.md` — document de préparation antérieur conservé ; utiliser le guide 2.5.0 pour cette livraison, sans étape intermédiaire.

Le point d’entrée `server.js`, `backend/database.js`, les règles de mutation des transmissions, les scripts Windows, les scripts de sauvegarde/restauration, les comptes et les identités de praticiens ne sont pas modifiés par rapport à 2.4.0. La nouvelle table est additive ; aucun effacement des données existantes n’est nécessaire à l’installation.

## Limites et contrôles restant au cabinet

- iPhone : simulation Chromium et dimensions mobiles vérifiées ; aucun appareil physique ni Safari réel disponible pour cette validation.
- Windows 11 et scripts PowerShell : procédure fournie, non exécutée ici. Vérifier la sauvegarde, les chemins et les droits sur le PC avant remplacement du code.
- Titan : intégration manuelle du PDF uniquement, non testée dans le logiciel du cabinet.
- Moteur clinique déterministe : aide à la rédaction, pas une interprétation autonome ou une certification des protocoles. Les constats doivent être documentés et les textes validés par le praticien. Toute précaution explicite bloque les interventions automatiques et impose un projet manuel.
- Les brouillons nécessitent une sauvegarde volontaire. La liste des bilans se rafraîchit explicitement ; les conflits empêchent les écrasements. La synchronisation existante des transmissions reste inchangée.
- Base et exports non chiffrés par l’application ; protections Windows, disque, sauvegardes et accès privé requis. Les limites de sécurité déjà documentées restent applicables. Aucune conformité pour des données de santé réelles n’est certifiée par cette livraison.
