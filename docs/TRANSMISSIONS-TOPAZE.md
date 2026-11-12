# Transmissions : pointage Topaze et avertissement de doublon

## Fonctionnement

Dans l'historique (Kiné ou Boss), chaque ligne propose « Voir le suivi » et, tant qu'elle n'est pas pointée, « Pointer sur Topaze ». Après confirmation par le serveur, seul « Voir le suivi » reste dans les actions de cette ligne. Le détail affiche la date et le nom du compte ayant pointé. Le pointage est manuel : aucune connexion à Topaze ni modification de Topaze n'est effectuée.

Le pointage est indépendant du statut Titan : il ne supprime ni texte ni observation et ne change pas les transmissions à saisir dans Titan. Il est disponible aux trois rôles déjà connectés. Un second clic ou une requête simultanée conserve la première date et le premier utilisateur. La date et l'identité proviennent du serveur.

Le serveur vérifie les doublons pour le même identifiant résident et la même date de séance, indépendamment de l'activité, du praticien ou du statut (y compris les transmissions annulées et les suivis Titan). Les lignes dans la corbeille ne font plus partie des transmissions actives. Il affiche :

« Attention, une transmission existe déjà pour ce résident à cette date. Voulez-vous vraiment en enregistrer une nouvelle ? »

« Annuler », la fermeture de la fenêtre et Échap conservent la saisie. « Enregistrer quand même » autorise volontairement le doublon. La vérification et l'écriture se font dans une même transaction `BEGIN IMMEDIATE` : deux créations simultanées non confirmées ne passent pas toutes les deux. L'ancienne API de sauvegarde complète applique aussi la vérification.

## SQLite et sauvegarde avant installation manuelle

Aucune migration de schéma, réinitialisation ou conversion des anciennes transmissions n'est nécessaire. Le pointage est un champ facultatif `topaze` (`at`, `userId`, `userName`) dans le JSON déjà stocké dans SQLite. Son absence signifie « non pointée ». Il est conservé lors du passage en suivi Titan, des sauvegardes et des mises en corbeille/restaurations. Aucun module Bilans, compte, permission ou réglage Tailscale n'est modifié.

Avant de remplacer le code sur le PC du cabinet, et impérativement avant toute migration future :

1. Arrêter le serveur avec la procédure Windows habituelle et conserver l'ancienne version du code.
2. Depuis l'ancien dépôt, en conservant son `INFINITY_DATA_DIR` configuré, exécuter `npm run backup -- "CHEMIN_VERS_UN_NOUVEAU_FICHIER.sqlite"`. Utiliser un nouveau chemin hors du dépôt et de la base active. Le script utilise l'API de sauvegarde SQLite et refuse d'écraser une sauvegarde existante. Ne pas copier uniquement un fichier SQLite pendant une écriture WAL.
3. Vérifier sur une copie de la sauvegarde `PRAGMA integrity_check` (résultat `ok`) et conserver la sauvegarde sur un support protégé. Ne remplacer aucun fichier de données, `config.json` ou paramètre Tailscale.
4. Installer manuellement la version relue, puis redémarrer le serveur habituel. Vérifier le pointage sur des données fictives et son maintien après actualisation.

En cas de migration future, ne la lancer qu'après validation de la sauvegarde. Aucun script de déploiement, migration ou restauration n'est lancé automatiquement par cette modification. L'ancienne version peut ignorer les nouveaux champs : conserver la sauvegarde et les versions de code pour préparer un retour arrière explicite.

## Validation dans le cloud

- `npm test` : tests métier/API et non-régression, dont `tests/transmissions-topaze.test.js` (concurrence, confirmation explicite, protection de l'ancienne API, droits existants, CSRF, idempotence, utilisateur serveur, redémarrage SQLite et conservation après saisie Titan).
- `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node tests/transmissions-topaze-browser.mjs` : avertissement entre activités différentes, annulation/Échap sans perte de saisie, confirmation volontaire, boutons Topaze, suivi et persistance après actualisation.
- `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs node tests/private-browser.mjs` : parcours privé existant, trois rôles, synchronisation, affichage mobile et panne réseau.

Les tests utilisent des bases et comptes fictifs temporaires. Les empreintes des seuls fichiers communs modifiés sont actualisées dans le manifeste de diagnostic existant ; les sources Bilans et ses tests ne sont pas modifiés. Windows, iPhone/Safari et l'installation réelle au cabinet ne sont pas validés par ces tests Linux.
