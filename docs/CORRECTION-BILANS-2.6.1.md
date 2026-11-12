# Correction ciblée du chargement des Bilans — 2.6.1

**Si le 404 persiste après copie manuelle, utiliser désormais la [réparation de l’installation configurée](REPARATION-INSTALLATION-BILANS-2.6.1.md)**, qui cible le bon projet et vérifie les réponses après redémarrage.

## Cause établie et limite du diagnostic à distance

La console fournie montre HTTP 404 sur `/src/assessments-compact.js`. Ce module est une dépendance obligatoire de `assessments.js` : son import échoue et le panneau ne peut pas démarrer. La capture de l’Explorateur montre le fichier sur disque, mais ne prouve pas que ce dossier est celui utilisé par le processus Node actif.

Le serveur officiel 2.6.0 autorise déjà ce chemin. Le cas a été reproduit avec un ancien `backend/server.js` dont la liste statique ne contient pas ce module, puis avec le fichier corrigé sur disque mais l’ancien processus toujours en mémoire. L’ancien outil de réparation ne traitait que les deux modules 2.5.0 et omettait `assessments-compact.js` : il traite maintenant les trois. Un autre dossier servi donne aussi ce symptôme. Le diagnostic ci-dessous permet de distinguer ces situations sur le PC ; aucun accès au PC du cabinet n’a été effectué pendant cette correction.

Le 502 également visible sur la capture n’indique pas son URL complète. Il ne permet pas de conclure à une panne SQLite ou à un problème Tailscale. Le nouveau diagnostic affiche les réponses HTTP exactes ; ne pas modifier Tailscale pour corriger une route JavaScript manquante.

Le serveur résout ses fichiers relativement à `backend/server.js`, pas au répertoire courant du terminal. La tâche Windows habituelle lit `config.json`, se place dans `config.project` et lance `node server.js`. Copier les fichiers dans un autre dossier ne met pas à jour ce processus.

## Contenu du correctif

Archive : `correctifs/infinity-correction-bilans-2.6.1.zip`. Elle contient uniquement les fichiers du correctif, sans données, configuration, installateur ou script de démarrage. À utiliser sur une installation 2.6.0 existante.

Fichiers d’exécution à remplacer :

- `backend/server.js` : liste complète des modules conservée ; lecture du fichier avant l’envoi de HTTP 200, vrai HTTP 404 si le fichier manque.
- `src/app.js` : contrôle HTTP/MIME des trois modules, cache 2.6.1 et détail des erreurs d’import ou d’initialisation.
- `src/assessments.js` : cache 2.6.1 ; détail de l’URL, du statut et des réponses incompatibles des API de listes.
- `src/assessments-domain.js` : uniquement la version d’import du module compact.
- `src/assessments-compact.js` : copie identique à 2.6.0 pour garantir sa présence.
- `src/style.css` : uniquement la présentation lisible des diagnostics.
- `index.html`, `package.json` : version 2.6.1 et déclaration du nouveau test.

Outils : `scripts/diagnose-bilans.js`, `scripts/bilans-runtime-manifest.json`, `scripts/repair-static-routes.js`. Tests : `tests/bilans-load.test.js`, `tests/static-imports.test.js`, `tests/startup-browser.mjs`. Documentation : ce guide et `docs/VALIDATION-2.6.1.md`.

Aucune modification des moteurs cliniques, du PDF, des routes métier, du schéma SQLite, des transmissions, de la conservation ou des permissions. Les dépendances backend et les polices du PDF restent celles de 2.6.0 ; le manifeste vérifie aussi leur présence et leur empreinte.

## 1. Télécharger et identifier le dossier actif

Télécharger puis extraire entièrement l’archive dans `C:\Infinity-correctif-2.6.1`. Ne pas travailler directement dans le ZIP. Ouvrir PowerShell avec le même compte Windows que celui de la tâche Infinity Therapy. Adapter le chemin d’extraction si nécessaire.

```powershell
$ErrorActionPreference = 'Stop'
$release = 'C:\Infinity-correctif-2.6.1'
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$project = $config.project
$project
& $config.node --version
# Node.js >= 24.13.0, comme pour 2.6.0.
Get-ScheduledTask -TaskName 'InfinityTherapyDemo' | Select-Object TaskName,State,Actions,Principal
Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" } |
  Select-Object ProcessId,ExecutablePath,CommandLine
```

Vérifier que la tâche utilise le compte attendu et le script existant `start-windows.ps1`. Ce script utilise `config.project`. Ne pas modifier la tâche, sa configuration ou le port. Une ligne de commande `node server.js` ne suffit pas à prouver le dossier du processus ; la comparaison HTTP/empreinte ci-dessous complète le contrôle. Si votre tâche a un autre nom, utiliser son nom existant dans les commandes d’arrêt et de démarrage.

## 2. Diagnostic avant remplacement, sans modification

Lancer l’outil depuis le dossier extrait, pendant que le serveur tourne. Il n’installe rien, ne démarre rien et ne lit aucune ligne médicale. `--schema` inspecte uniquement les noms de tables et de colonnes SQLite en lecture seule.

```powershell
& $config.node (Join-Path $release 'scripts\diagnose-bilans.js') --config $configPath --schema
if ($LASTEXITCODE -ne 0) { throw 'Diagnostic non exécuté : lire le message.' }
```

Le rapport indique `project`, les fichiers absents ou différents, les erreurs de syntaxe, les routes manquantes, les statuts HTTP, le type MIME et `matchesDisk`. `official-2.6.0` est normal avant correction ; `target` correspond au correctif.

- Route compacte absente : ancien backend sur disque.
- Fichier et route présents mais HTTP 404 : ancien processus en mémoire ou autre projet servi.
- `matchesDisk: false` : le serveur ne renvoie pas la copie configurée.
- HTTP 502 : distinguer l’accès local du chemin HTTPS, sans changer Tailscale.
- Dépendance backend/police absente ou schéma incomplet : arrêter la procédure et récupérer les fichiers officiels 2.6.0 manquants ; ne pas lancer de remise à zéro ou de script SQL. Ce correctif ne répare pas une base manuellement.

Pour comparer facultativement l’accès privé HTTPS aux contrôles locaux :

```powershell
& $config.node (Join-Path $release 'scripts\diagnose-bilans.js') --config $configPath --base 'https://pc-bureau.taild1b1f2.ts.net/'
```

## 3. Arrêter et sauvegarder

Fermer les sessions de saisie, arrêter la tâche existante, puis vérifier que son port n’écoute plus. Ne jamais arrêter tous les processus Node indistinctement. Si un serveur a été lancé manuellement, fermer uniquement sa fenêtre après vérification de son PID.

```powershell
Stop-ScheduledTask -TaskName 'InfinityTherapyDemo'
if (Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue) {
  throw 'Le serveur écoute encore : fermer uniquement le processus Infinity identifié, puis revérifier.'
}
if (!(Test-Path -LiteralPath (Join-Path $config.dataDir 'demo.sqlite'))) {
  throw 'Base existante introuvable : ne pas poursuivre.'
}
# Choisir un emplacement privé protégé, hors du projet et du dossier des données.
$backupRoot = 'E:\SauvegardesInfinity'
$backup = Join-Path $backupRoot ('avant-correctif-2.6.1-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath $project -Destination (Join-Path $backup 'code') -Recurse
Copy-Item -LiteralPath $config.dataDir -Destination (Join-Path $backup 'donnees') -Recurse
Copy-Item -LiteralPath $configPath -Destination (Join-Path $backup 'config.json')
$backup
```

Vérifier la présence de ces trois copies et du fichier `donnees\demo.sqlite`. Conserver tout le dossier de données, y compris les éventuels fichiers WAL/SHM, serveur arrêté. Ne pas utiliser une commande de sauvegarde qui démarre l’application ou applique une migration. Ne pas partager la sauvegarde ou `config.json` publiquement.

## 4. Remplacer uniquement les fichiers livrés

Dans la même fenêtre PowerShell, serveur toujours arrêté :

```powershell
$files = @(
 'backend/server.js',
 'src/app.js','src/assessments.js','src/assessments-domain.js',
 'src/assessments-compact.js','src/style.css','index.html','package.json',
 'scripts/diagnose-bilans.js','scripts/bilans-runtime-manifest.json','scripts/repair-static-routes.js',
 'tests/bilans-load.test.js','tests/static-imports.test.js','tests/startup-browser.mjs',
 'docs/CORRECTION-BILANS-2.6.1.md','docs/VALIDATION-2.6.1.md'
)
foreach ($file in $files) {
  $source = Join-Path $release $file
  if (!(Test-Path -LiteralPath $source)) { throw "Archive incomplète : $file" }
}
foreach ($file in $files) {
  $destination = Join-Path $project $file
  New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null
  Copy-Item -LiteralPath (Join-Path $release $file) -Destination $destination -Force
}
Set-Location -LiteralPath $project
& $config.node --check backend/server.js
if ($LASTEXITCODE -ne 0) { throw 'Syntaxe serveur invalide.' }
& $config.node --test tests/static-imports.test.js tests/bilans-load.test.js
if ($LASTEXITCODE -ne 0) { throw 'Tests échoués : ne pas redémarrer avec un mélange de fichiers.' }
```

Ces sept tests utilisent des bases temporaires fictives ; ils ne touchent pas au dossier de données du cabinet. Aucun `npm install`, script de configuration, réinitialisation de compte ou changement du démarrage automatique n’est nécessaire. Ne pas lancer en plus l’ancien outil de réparation : le serveur livré contient déjà les trois routes.

## 5. Redémarrer et vérifier

```powershell
Start-ScheduledTask -TaskName 'InfinityTherapyDemo'
# Après quelques secondes, vérifier l’écoute puis les fichiers réellement servis :
Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue
& $config.node (Join-Path $project 'scripts\diagnose-bilans.js') --config $configPath --schema
```

Résultat attendu : les sept modules répondent HTTP 200 avec MIME JavaScript, `matchesDisk: true`, aucune dépendance absente, aucune erreur de syntaxe, aucune route manquante. Les fichiers corrigés sont `target` ; ceux inchangés sont également `target` car leur empreinte 2.6.0 est conservée. Le schéma doit être présent sans colonne manquante. Le contrôle ne modifie jamais SQLite.

Ouvrir **https://pc-bureau.taild1b1f2.ts.net/** et forcer le rechargement avec **Ctrl + Maj + R**. Sur iPhone, fermer puis rouvrir l’onglet. Vérifier le pied de page 2.6.1, ouvrir « Bilans résidents », consulter un bilan existant et son PDF, puis revenir à Kiné. L’URL `/src/assessments-compact.js?v=2.6.1` doit afficher le JavaScript et non « Introuvable ».

Si les contrôles locaux passent mais pas ceux de l’URL privée, conserver le rapport et le statut exact pour examiner le chemin HTTPS ; ne pas modifier Tailscale au hasard. Si le panneau échoue encore, il affiche désormais l’étape, le chemin ou l’API et l’erreur précise. Partager uniquement ce diagnostic, pas les données cliniques ou une réponse API complète.

## Retour arrière

Arrêter la même tâche, vérifier le port fermé, puis recopier depuis `$backup\code` uniquement les fichiers de `$files` qui y existaient. Pour les nouveaux fichiers d’outillage absents de la sauvegarde, les laisser inactifs est sans effet métier. Redémarrer la tâche existante. Ne jamais remplacer les données par une ancienne sauvegarde pour annuler ce correctif : il n’introduit aucune migration. La version précédente peut naturellement reproduire le défaut de chargement.

Aucun déploiement sur le PC n’est effectué par la publication GitHub. La validation de votre dossier réellement actif et du redémarrage reste à effectuer avec cette procédure.
