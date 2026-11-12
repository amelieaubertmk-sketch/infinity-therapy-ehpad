# Validation — Bilans résidents 2.6.0

12 novembre 2026, Linux cloud, Node.js 24.22.1 et Chromium. Tous les essais utilisent des résidents, comptes et textes fictifs et des répertoires SQLite temporaires. Aucun accès à la base du cabinet, aucun déploiement Windows et aucune modification Tailscale, de port ou de tâche planifiée.

## Tests exécutés

| Vérification | Résultat |
| --- | --- |
| `npm test` | 28 tests réussis, 0 échec, 0 ignoré : domaine existant, API, conservation, bilans historiques, format compact et routes statiques |
| `tests/assessments-browser.mjs` | Réussi : formulaire compact et historique, sauvegarde, validations, PDF, bon document depuis une autre ligne, suivi Titan et corbeille |
| `tests/private-browser.mjs` | Réussi : parcours existants, création et modèles, comptes isolés, synchronisation, statuts Titan des transmissions, panne réseau, saisie conservée et mobile |
| `tests/startup-browser.mjs` | Réussi : chargement normal, cache ancien évité, module absent isolé, import incompatible contrôlé, JavaScript indisponible avec message visible |
| `tests/bulk-browser.mjs` | Réussi : sélection/export Excel/corbeille des transmissions dans l’historique, confirmation annulée, restauration |
| `tests/ergonomics-browser.mjs` | Réussi : PC et iPhone simulé, trois rôles, couleurs/groupes/tri/filtres des transmissions conservés |
| `node --check` / `git diff --check` | Réussis pour les modules vérifiés et les différences du dépôt |

Commandes navigateur dans l’environnement de validation :

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/assessments-browser.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/private-browser.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/startup-browser.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/bulk-browser.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/ergonomics-browser.mjs
```

Le test HTTP parcourt les imports statiques et dynamiques depuis `index.html`, découvre **sept modules JavaScript**, vérifie HTTP 200, MIME JavaScript et octets identiques au projet, avec leurs versions actuelles, sans version et avec `?v=2.5.0`. Il fonctionne depuis un répertoire courant différent et vérifie que les fichiers privés ne sont pas exposés. La nouvelle route `assessments-compact.js` est donc incluse dans le contrôle contre les 404.

## Couverture clinique et ergonomique

- Aucune réponse arbitraire pour la réalisabilité MRC, la marche et le fauteuil. Observations et bilan articulaire masqués par défaut, texte retrouvé après désactivation/réactivation et après sauvegarde.
- MRC : ordre des tableaux, droite/gauche, 0/5, NE, cellules vides, motifs individuels, valeurs hors limites refusées ; pas de déficit attribué à une valeur absente ou NE.
- Marche possible/impossible, aides multiples et aides réelles différentes pour un test, fauteuil indépendant. TUG bloqué et partie marche Tinetti désactivée si marche impossible, sans effacer les réponses du brouillon.
- Tinetti : total maximal 16+12=28, menus guidés, absence de total sur NE/partiel/marche impossible, limites des bandes 18/19/24/25/28. Les tests partiels ne reçoivent pas de classification.
- TUG et 5xSTS : temps mesuré positif, protocole et bras, lecture descriptive sans seuil généralisé ou diagnostic de force sur un temps isolé.
- Transferts : réponses distinctes et effaçables ; absence non transformée en dépendance. Nouveau constat de consigne sans diagnostic médical.
- Génération des deux propositions, conservation des corrections manuelles, refus du remplacement si confirmation annulée, propositions et versions conservées, validation professionnelle distincte de la génération et de la sauvegarde.
- Réévaluation depuis un bilan finalisé : informations utiles reprises, anciennes mesures consultables, nouvelles mesures sans préremplissage fictif, pas d’écart chiffré entre protocoles incompatibles.
- Consultation d’un ancien bilan avec antécédents historiques conservés et données brutes identiques avant/après les essais.

## Brouillons, permissions et suivi Titan

L’API teste propriétaire, autre kiné, administratrice et secrétariat selon leurs droits ; les requêtes de suppression avec droits insuffisants, absence de CSRF ou confirmation manquante sont refusées. Un bilan finalisé ne peut être supprimé par l’action de brouillon.

Le navigateur teste création, annulation de suppression, suppression logique puis restauration de la version enregistrée. Un brouillon supprimé quitte les actifs, reste récupérable et demeure persistant après redémarrage/sauvegarde.

Un finalisé apparaît dans les attentes Titan. La consultation et le téléchargement ne le marquent pas comme saisi. Le refus de confirmation conserve l’attente. La confirmation manuelle enregistre date/utilisateur, retire l’attente et conserve le bilan et le PDF dans l’historique. Un PDF peut être demandé depuis une ligne différente du bilan ouvert dans le formulaire, sans confusion d’identifiant.

L’état JSON et la révision des résidents/transmissions/modèles restent strictement identiques aux valeurs de référence. Les comptes sont conservés. L’ancien bilan finalisé n’est pas réécrit. L’audit technique ne contient pas les textes cliniques. Les sauvegardes vérifiées par `PRAGMA integrity_check` contiennent suivi, versions et PDF.

## PDF et confidentialité

`pdfinfo` et `pdftotext` ont été exécutés dans le cloud : validité du fichier, A4 portrait, métadonnées sans identifiant patient, texte accentué/Unicode, absence des codes/identifiants/unités connus, absence du texte des rubriques désactivées et nom neutre `Bilan_Kinesitherapique_AAAA-MM-JJ.pdf`.

Les tests de la version historique continuent à générer des PDF d’une et de plusieurs pages ; un exemple du nouveau format complet a également été rendu avec `pdftoppm` et inspecté visuellement. Tableaux MRC en trois colonnes, seuls mouvements renseignés, légende NE, résumé Tinetti sans détail des vingt choix, sections numérotées, paragraphes courts regroupés, en-tête et pied de page neutres. Les vues mobiles ont été inspectées sur captures de données fictives.

Le premier PDF exporté est stocké avec le bon bilan et les exports suivants rendent les mêmes octets après confirmation Titan. Les données internes identifiantes restent dans l’application et SQLite, pas dans le nom ni les métadonnées du document exporté. Cette séparation ne garantit pas une anonymisation complète du texte libre. Les anciennes copies déjà téléchargées restent inchangées.

Sur une machine sans `pdfinfo` ou `pdftotext`, les contrôles externes optionnels des tests serveur sont signalés comme non exécutés ; ils ne sont pas des dépendances de production. Ils ont bien été exécutés ici. Les tests navigateur nécessitent Playwright et Chromium dans l’environnement de développement.

## Modifications et migration

Fichiers d’application modifiés :

- `backend/assessments.js` : tables additives, schéma compact ou historique, corbeille, confirmations, versions, document associé et contrôle des permissions.
- `backend/assessment-pdf.js` : synthèse compacte A4, tableaux, neutralisation des identifiants connus, PDF historique conservant ses données cliniques.
- `backend/server.js` : une route statique autorisée pour le nouveau module clinique ; pas de serveur de répertoires arbitraires.
- `src/assessments.js` : formulaire conditionnel, génération, versions, ancien format, corbeille, attentes/historique Titan et confirmation du bon résident avant PDF.
- `src/assessments-domain.js` : délégation au format compact, compatibilité historique et comparaisons prudentes.
- `src/assessments-compact.js` (nouveau) : schéma structuré, barèmes, aides effectives, dépendances, interprétations et modèles déterministes.
- `src/style.css` : uniquement des règles ciblées sur Bilans pour les tableaux, le formulaire et l’affichage mobile.
- `src/app.js` : référence du module Bilans et numéro affiché, sans changer les opérations de transmission.
- `index.html` : références de cache actualisées.
- `package.json` : version 2.6.0 et ajout des tests de bilans/routes aux vérifications habituelles.
- `README.md` : accès à la livraison et aux guides 2.6.0.

Tests modifiés/ajoutés : `tests/assessments.test.js` (confirmation du résident avant export), `tests/assessments-compact.test.js`, `tests/assessments-browser.mjs`.

Documentation ajoutée : `docs/BILANS-RESIDENTS-2.6.0.md`, `docs/MISE-A-JOUR-2.6.0.md`, `docs/MIGRATION-BILANS-2.6.0.sql`, `docs/VALIDATION-2.6.0.md`.

Migration automatique additive : `assessment_tracking`, `assessment_versions`, `assessment_documents`. L’ancienne table `assessments` et les autres tables/colonnes ne sont pas remplacées. Aucun ancien document clinique n’est converti ou effacé lors de l’initialisation. Les versions intermédiaires antérieures non enregistrées par les anciennes versions ne peuvent pas être reconstruites rétroactivement.

Inchangés : `server.js`, `backend/database.js`, `backend/mutations.js`, `src/domain.js`, `src/store.js`, les scripts de sauvegarde/restauration, de configuration et de démarrage Windows. Aucun changement de résident, compte, praticien ou règle des transmissions n’est effectué.

## Limites connues

La validation mobile utilise Chromium et une simulation iPhone 13 ; Safari sur un iPhone physique n’a pas été testé. Les instructions PowerShell n’ont pas été exécutées sur le PC du cabinet. L’import dans Titan reste manuel et n’a pas été réalisé dans le logiciel du cabinet.

Les règles locales sont une aide à la rédaction, pas une validation médicale autonome. Les références et limites sont décrites dans le guide clinique ; les textes doivent être relus et les précautions applicables vérifiées par le professionnel. Aucun seuil arbitraire de TUG/5xSTS n’est appliqué aux résidents d’EHPAD. Les valeurs absentes/NE ne sont jamais extrapolées.

Les textes facultatifs masqués sont conservés en base, pas détruits. La corbeille n’a aucune purge automatique. Les documents et les sauvegardes ne sont pas chiffrés par l’application ; la protection du poste, du disque, des sauvegardes et des accès privés reste indispensable. L’absence d’identifiant ne suffit pas à certifier une anonymisation ou une conformité réglementaire.

## Archive de livraison

L’archive complète a été extraite dans un dossier indépendant et les 28 tests y ont été relancés avec succès. Elle ne contient ni base SQLite, ni configuration privée, ni fichiers de patients. Les fichiers `livraisons/infinity-therapy-2.6.0.zip` et `.sha256` constituent les artefacts distribués ; ils ne font pas partie des données persistantes.
