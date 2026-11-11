# Validation 2.4.0 et développement cloud

Validation du 11 novembre 2026 sur Linux, Node.js 24.22.1 et Chromium. Accès au dépôt vérifié par `git ls-remote origin HEAD` avant modification. État initial du dépôt propre. Aucun accès à la base du cabinet, aucune réinitialisation et aucune modification Tailscale.

- `npm test` : 20 tests réussis, 0 échec, 0 ignoré. Authentification, droits, CSRF, conflits, immutabilité, migrations existantes, sauvegarde/restauration, persistance, export sans texte médical, XML/ZIP, absence de formules, suppression groupée atomique et restauration.
- `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node tests/private-browser.mjs` : parcours existants réussis, trois sessions isolées, synchronisation, audit, affichage mobile et panne réseau avec formulaire conservé. Les sélecteurs dépendants de l’ancien tri ont été adaptés à la transmission de soins visée.
- Même préfixe avec `node tests/bulk-browser.mjs` : sélection et Tout sélectionner, état partiel, téléchargement, filtre et remise à zéro, regroupement, couleurs, tri, refus de confirmation, corbeille et restauration réussis, sans erreur JavaScript navigateur.
- `node --check` sur les modules modifiés et `git diff --check` : réussis.

Pas de compilation ni de dépendance de production. Les scripts PowerShell, Microsoft Excel, Tailscale et Safari/iPhone n’ont pas été exécutés sur le matériel du cabinet. La structure du classeur a été contrôlée par ZIP et XML, et son téléchargement par Chromium ; l’ouverture dans Microsoft Excel reste à vérifier lors de l’installation. L’écart réel 15/16 ne peut pas être confirmé sans les données du cabinet.

## Instructions de reprise cloud

Utiliser le dépôt existant `/workspace/infinity-therapy-ehpad`. Chaque tâche cloud est déjà isolée : ne pas créer de worktree sans demande explicite. Node.js >=24.13, pas de `npm install` nécessaire. Exécuter `npm test`, puis les deux suites navigateur ci-dessus (adapter les chemins Playwright/Chromium à l’environnement disponible).

Pour un serveur manuel, choisir un dossier de développement hors du dépôt avec `INFINITY_DATA_DIR`, puis `INFINITY_ORIGIN=http://localhost:3000` et `PORT=3000`. Créer uniquement un compte fictif avec `node scripts/admin.js create` si ce dossier est neuf. Lancer `npm start`. Vérifier que `/` fournit le HTML et `/api/state` répond 401 sans authentification, puis se connecter avec le compte fictif. Les processus doivent être relancés après restauration d’un environnement ; ne pas supposer qu’un serveur reste actif dans le snapshot. Ne jamais utiliser les données du cabinet dans le cloud.

L’outil de configuration cloud n’a pas pu lire le brouillon après deux essais et n’a pas confirmé la sauvegarde de `start_skill` (`INVALID_ARGUMENT`). Ces instructions sont donc conservées dans le dépôt ; la configuration réutilisable de la plateforme n’est pas confirmée et aucune publication d’environnement n’est revendiquée.
