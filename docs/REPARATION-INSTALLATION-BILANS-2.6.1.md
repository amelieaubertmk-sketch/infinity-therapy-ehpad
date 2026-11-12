# Réparation de l’installation Bilans 2.6.1 — 404 persistant

Cette livraison répare le routage et les fichiers du **projet configuré**, puis vérifie les réponses du serveur redémarré. Elle ne change pas la version fonctionnelle, le formulaire, la base ou les règles métier. Aucun déploiement distant n’est effectué.

## Constat précis

Le fichier responsable du blocage est `src/assessments-compact.js`. Il existe dans le tag officiel `v2.6.1` ; son nom correspond exactement aux imports de `src/assessments.js` et `src/assessments-domain.js`. Il ne nécessite aucune dépendance npm externe.

La route `/src/assessments-compact.js` est dans la liste `const files` de `backend/server.js` officiel 2.6.1 et sert ce fichier avec `text/javascript; charset=utf-8`. Le serveur utilise `url.pathname`, donc `?v=2.6.1` ne change pas la route. Les fichiers sont résolus relativement au fichier serveur, pas au terminal.

L’erreur HTTP 404 observée sur le PC reste une erreur de service de ce module obligatoire, avant tout accès API Bilans. Elle ne prouve pas une panne SQLite. Dans le dépôt complet, cette requête répond HTTP 200. Sans accès au PC, il est impossible d’affirmer si le backend actif est ancien en mémoire, s’il manque la route sur disque, ou si un autre dossier est lancé. Afficher le pied de page 2.6.1 prouve la version du frontend reçu, pas celle du processus backend.

La réparation précédente demandait des copies manuelles dans le bon dossier. Cette livraison évite cette source d’erreur : le script lit le `config.json` existant du compte Windows habituel et utilise exclusivement sa propriété `project`. Il vérifie aussi que la tâche existante utilise le script standard qui lit cette même configuration. Il ne modifie ni la tâche ni son démarrage automatique.

## Ce que fait la réparation

1. Vérifie les empreintes des dépendances frontend, backend et des polices PDF contre les versions officielles 2.6.0/2.6.1 ; contrôle leur syntaxe. Une dépendance étrangère, absente hors des trois modules Bilans ou un démarrage inhabituel provoque un refus explicite avant modification.
2. Arrête la tâche existante et attend la fermeture du port. Si un serveur manuel reste actif, aucun fichier n’est modifié ; le script demande de fermer uniquement ce processus.
3. Copie le dossier persistant complet et la configuration vers un dossier de sauvegarde privé, serveur arrêté. Il n’ouvre jamais SQLite.
4. Sauvegarde le code à remplacer. Ajoute **uniquement les routes Bilans manquantes** dans la liste statique du `backend/server.js` configuré. Les autres lignes, notamment les routes métier, sont conservées.
5. Restaure les trois modules Bilans à partir des sources officielles 2.6.1 uniquement s’ils sont absents ou différents ; leurs empreintes sont vérifiées avant copie. Aucun texte clinique ou modèle n’est réécrit.
6. Redémarre la même tâche, même si la route était déjà correcte sur disque, afin de recharger le code Node en mémoire.
7. Teste réellement les **sept URL JavaScript** en HTTP local, dont `/src/assessments-compact.js?v=2.6.1` : statut 200, MIME JavaScript, contenu identique au fichier du projet configuré. Si un contrôle échoue, la réparation n’annonce pas de réussite.

Les sept modules sont `app.js`, `store.js`, `demo-store.js`, `domain.js`, `assessments.js`, `assessments-domain.js`, `assessments-compact.js`.

## Installation Windows — une commande de réparation

Sur le PC du cabinet, avec le compte Windows habituel de l’application :

1. Télécharger `infinity-reparation-installation-bilans-2.6.1.zip` depuis le lien fourni.
2. Clic droit → **Extraire tout**. Choisir `C:\Infinity-reparation-bilans-2.6.1`. Ce dossier doit contenir directement `package.json`, `src`, `scripts` et `docs`. Ne pas extraire dans le projet actif ni copier manuellement ses dossiers.
3. Fermer les saisies en cours sur PC/iPhone. Ouvrir **Windows PowerShell** avec ce même compte ; aucune réinstallation de Node n’est nécessaire si 2.6.1 fonctionne déjà ailleurs.
4. Coller ces lignes. La sauvegarde est créée dans un dossier distinct sous votre profil local, sans service externe. Utiliser un disque protégé et chiffré ; ce dossier contient des données confidentielles.

```powershell
$repair = 'C:\Infinity-reparation-bilans-2.6.1'
$backupRoot = Join-Path $env:LOCALAPPDATA 'InfinityTherapySauvegardes'
Get-ChildItem -LiteralPath $repair -Recurse -File | Unblock-File
& (Join-Path $repair 'scripts\repair-bilans-windows.ps1') -BackupRoot $backupRoot
```

`Unblock-File` ne change pas la stratégie d’exécution Windows. Si votre entreprise interdit les scripts, ne pas modifier cette stratégie : faire exécuter la procédure par la personne qui administre le PC.

Le script affiche le **projet configuré**, le compte, le nom de la tâche et le chemin de sauvegarde. Garder ces informations. Le nom standard est `InfinityTherapyDemo`. Si votre tâche existante porte un autre nom connu, ajouter `-TaskName 'SonNomExact'` à la dernière commande. Ne pas créer une nouvelle tâche.

Si le port reste ouvert après arrêt : le script n’a remplacé aucun fichier. Fermer la fenêtre du serveur Infinity lancé manuellement, puis relancer la commande. Ne pas tuer tous les processus Node. Si le script indique une incompatibilité, conserver son message et ne pas forcer la copie ou réinitialiser quoi que ce soit.

## Contrôle de réussite

La dernière ligne doit annoncer :

> Verification locale reussie : 7 modules HTTP 200, MIME JavaScript, contenu identique au projet configure.

Puis ouvrir **https://pc-bureau.taild1b1f2.ts.net/**, faire **Ctrl + Maj + R** et ouvrir **Bilans résidents**. Sur iPhone, fermer puis rouvrir l’onglet. Consulter un bilan existant et son PDF sans modifier ses validations.

Pour refaire le contrôle local seul, sans arrêt ou modification :

```powershell
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
& $config.node (Join-Path $repair 'scripts\repair-bilans-installation.js') `
  --project $config.project --verify --base ('http://127.0.0.1:' + $config.port)
```

Pour comparer les réponses HTTPS privées, remplacer uniquement l’argument `--base` par `'https://pc-bureau.taild1b1f2.ts.net/'`. Ce contrôle consulte uniquement les fichiers publics de l’application, pas les dossiers patients. S’il réussit localement mais échoue via HTTPS, conserver les deux rapports : le routage Node local est alors vérifié et le chemin HTTPS reste à diagnostiquer, sans changer Tailscale automatiquement. Ne pas annoncer le module réparé sur le PC tant que ces contrôles n’y ont pas réussi.

## Sauvegarde et retour arrière

Le dossier affiché contient `donnees`, `config.json` et `code`. La sauvegarde du code contient les fichiers réellement changés et `manifest.json`, qui indique aussi lesquels étaient auparavant absents. Conserver cette sauvegarde privée.

Pour annuler : arrêter la tâche, vérifier le port fermé, recopier uniquement les fichiers de `code\backend` et `code\src` vers leurs mêmes chemins dans le projet configuré, si ces dossiers existent. Les fichiers restaurés alors qu’ils étaient absents auparavant peuvent rester en place : ils ne modifient aucune donnée et sont des dépendances officielles. Redémarrer la tâche existante. **Ne pas restaurer une ancienne base pour annuler cette réparation**, qui n’exécute aucune migration. Revenir à un backend dont la route manque fera naturellement réapparaître le 404.

Si une copie échoue en cours de réparation, l’outil restaure automatiquement les fichiers de code touchés à leur contenu précédent et conserve la sauvegarde. Le script n’annonce pas de réussite et laisse le serveur arrêté si l’application du correctif échoue. Lire l’erreur avant de redémarrer.

## Fichiers livrés et tests

Nouveaux outils : `scripts/repair-bilans-installation.js` et `scripts/repair-bilans-windows.ps1`. Ils réutilisent `repair-static-routes.js`, `diagnose-bilans.js` et le manifeste 2.6.1, inchangés. Les trois sources `src/assessments*.js` et `package.json` sont strictement identiques au tag officiel 2.6.1. Aucune nouvelle version du message d’erreur, aucune refonte du module.

Le test `tests/repair-bilans-installation.test.js` est disponible dans le dépôt. Il vérifie une véritable réponse 404 avec fichier présent, l’application de la route dans le projet configuré, le redémarrage avec les mêmes données fictives, puis HTTP 200/MIME/contenu pour les sept modules. Il vérifie aussi la restauration d’un module absent et le refus sans écriture si le serveur tourne ou si les dépendances sont incompatibles.

Voir `docs/VALIDATION-REPARATION-BILANS-2.6.1.md` pour les résultats et les limites du banc de test.
