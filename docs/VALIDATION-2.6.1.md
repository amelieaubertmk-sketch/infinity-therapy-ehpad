# Rapport de validation — correctif Bilans 2.6.1

Validation du 12 novembre 2026, environnement Linux isolé, Node.js 24.22.1, Chromium avec Playwright. Données exclusivement fictives. Aucun accès au serveur Windows ni à sa base réelle. Aucun déploiement automatique.

## Résultats

- `npm test` : **32 tests réussis, 0 échec**. Inclut comptes, RBAC serveur, CSRF, conflits, audit, corbeilles, bilans, validations, PDF, sauvegarde, conservation et imports statiques.
- `tests/static-imports.test.js` : parcours des imports statiques et dynamiques depuis le HTML ; **7 modules** servis avec HTTP 200, MIME JavaScript et contenu exact, avec et sans version, même depuis un répertoire courant différent. Les fichiers privés et inconnus restent en HTTP 404. Réparation limitée aux trois routes et refus d’appliquer sur serveur actif.
- `tests/bilans-load.test.js` : **4 tests**. Reproduction d’un fichier compact présent mais non autorisé ; reproduction d’un ancien processus encore actif après correction sur disque ; fichier autorisé mais manquant donnant un vrai 404 ; schéma inspecté en lecture seule sans contenu clinique ni modification de base ; manifeste et syntaxe de toutes les dépendances. Certains cas sont réunis dans un même test.
- `tests/startup-browser.mjs` : **14 scénarios réussis**. Démarrage normal, ancien cache, module absent, compact absent, MIME incorrect, erreur de syntaxe, export manquant, route API incompatible, forme de réponse incompatible, API 502 HTML, module 502, ancien domaine incompatible, JavaScript bloqué et désactivé. Vérification du diagnostic précis, du retour à Kiné et de la conservation du stockage et de l’état serveur.
- `tests/assessments-browser.mjs` : parcours Bilans réussi sur ordinateur et viewport iPhone simulé. Champs facultatifs, MRC zéro/NE, aides, Tinetti guidé/partiel, marche impossible, textes manuels, validation, PDF neutre associé au bon bilan, suivi Titan manuel, annulation de suppression, restauration et rôles.
- `tests/private-browser.mjs` : parcours principal et droits réussis, conservation des transmissions et résidents, recherche/filtres, persistance et format mobile ; aucune erreur JavaScript inattendue.

Commande de navigateur utilisée dans cet environnement :

```bash
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/startup-browser.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/assessments-browser.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/private-browser.mjs
```

Les lancements initiaux sans `PLAYWRIGHT_MODULE` ont échoué car le paquet `playwright` n’est pas installé dans le dépôt ; utilisation ensuite de l’installation Playwright du banc de test. Aucune dépendance de production ajoutée. Un iPhone physique et Safari n’ont pas été testés.

Archive extraite et appliquée à une copie du tag officiel `v2.6.0` : les **7 tests de chargement et de routage passent également** dans cette installation recomposée. Les 16 fichiers du ZIP ont été comparés octet par octet aux sources ; aucune donnée ou configuration incluse.

## Étendue exacte

Fichiers modifiés : `backend/server.js`, `src/app.js`, `src/assessments.js`, `src/assessments-domain.js`, `src/style.css`, `index.html`, `package.json`, `scripts/repair-static-routes.js`, `tests/static-imports.test.js`, `tests/startup-browser.mjs`, `README.md`.

Fichiers nouveaux : `scripts/diagnose-bilans.js`, `scripts/bilans-runtime-manifest.json`, `tests/bilans-load.test.js`, `docs/CORRECTION-BILANS-2.6.1.md`, ce rapport, l’archive ciblée et son SHA-256. L’archive inclut aussi `src/assessments-compact.js` strictement identique à 2.6.0 pour corriger une copie manquante.

Comparaison avec le tag 2.6.0 : aucun changement des fichiers `backend/assessments.js`, `backend/assessment-pdf.js`, `backend/pdf-font.js`, `backend/database.js`, `backend/mutations.js`, `src/assessments-compact.js`, `src/domain.js`, `src/store.js`, du point d’entrée `server.js` ou des scripts de configuration/démarrage Windows. Aucune migration ou dépendance npm de production ajoutée. Les imports communs du store restent identiques pour conserver une seule session et un seul état frontend.

## Limites et diagnostic réel

Le 404 du module compact est confirmé par la capture et bloque son import. La cause exacte sur le PC entre ancien routage en mémoire, ancien fichier serveur ou autre répertoire doit être discriminée par le nouvel outil local ; la présence dans l’Explorateur ne suffit pas. La version officielle complète 2.6.0 passait déjà les tests de chargement avant correction. Aucun défaut clinique ou SQLite n’a été reproduit dans cette version complète.

Le correctif rétablit les trois routes avec le backend livré, remplace les dépendances frontend concernées et impose un redémarrage du processus adéquat. Il corrige aussi le faux 200 sur fichier absent et fournit des erreurs exploitables plutôt que de masquer l’exception. La cause du 502 visible sans URL complète n’est pas déterminable depuis la capture. Le nouveau contrôle permet de séparer HTTP local et HTTPS privé.

Les contrôles de manifeste identifient une installation mélangée ; ils ne constituent pas une certification de sécurité ou une preuve que les données sont intactes sur le PC. Les limites de sécurité 2.6.0 restent inchangées. La sauvegarde locale préalable et la vérification du dossier réellement servi sont indispensables.
