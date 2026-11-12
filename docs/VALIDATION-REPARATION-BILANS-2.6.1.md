# Validation de la réparation d’installation Bilans 2.6.1

12 novembre 2026. Node.js 24.22.1, environnement Linux isolé, données fictives. Aucun accès au PC du cabinet ou à sa base.

**Résultat : 34 tests Node réussis (32 existants + 2 nouveaux), zéro échec ; 14 scénarios navigateur réussis.**

- `npm test` : 32 tests existants, incluant les imports statiques/dynamiques HTTP des sept modules, la cohérence des sources/assets, les API, permissions, PDF et la préservation des données.
- `node --test tests/repair-bilans-installation.test.js` : 2 nouveaux tests de réparation effective. Le premier démarre une copie du serveur avec la route compacte retirée mais le fichier présent, constate HTTP 404, arrête le serveur, répare la route, redémarre et exige HTTP 200, JavaScript et contenu exact pour les sept modules. Le contenu de l’état SQLite et des autres fichiers métier est conservé. Le second restaure le module absent à partir du paquet officiel et vérifie le refus sans écriture sur un port actif ou une dépendance incompatible.
- Navigateur Chromium / Playwright : les 14 scénarios de `tests/startup-browser.mjs` vérifient le démarrage normal, les erreurs de modules/API et la préservation des autres rubriques.

Les fichiers frontend, backend et assets de l’application ne changent pas dans ce commit. La réparation modifie sur le PC uniquement les entrées Bilans manquantes de la liste statique et restaure si nécessaire les trois modules depuis 2.6.1. Les données, la configuration existante et les scripts de démarrage ne sont pas modifiés.

Limites : les fonctions Node de réparation sont testées avec un vrai serveur HTTP et des données temporaires. Le script PowerShell et le Planificateur Windows ne peuvent pas être exécutés dans ce banc Linux ; ils ont été relus, mais restent à valider sur Windows. Aucun iPhone physique ou Safari testé dans cette correction. Le diagnostic du processus réellement actif sur le PC doit être confirmé par les contrôles locaux fournis, et le chemin HTTPS privé est vérifié séparément. Aucun déploiement automatique.
