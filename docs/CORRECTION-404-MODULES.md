# Correction ciblée du 404 des modules Bilans — Windows 11

## Diagnostic du code

`server.js` à la racine démarre `createApp` depuis `./backend/server.js`. C’est **backend/server.js** qui contient la liste des fichiers HTTP autorisés ; modifier uniquement le `server.js` de la racine ne corrige pas cette liste.

Dans les versions publiées 2.5.0 et 2.5.1, la liste contient déjà :

```js
'/src/assessments.js':'src/assessments.js',
'/src/assessments-domain.js':'src/assessments-domain.js'
```

Le serveur utilise `new URL(req.url, allowed).pathname` : la présence de `?v=2.5.0` n’empêche pas la correspondance. Le dossier statique est obtenu par `fileURLToPath(new URL('../', import.meta.url))`, donc depuis l’emplacement de **backend/server.js chargé**, et non depuis le dossier courant du terminal.

Le 404 JSON `{"error":"Introuvable."}` correspond notamment à un chemin absent de cette liste dans le code effectivement exécuté. La présence du fichier sur le disque ne suffit pas. Si le fichier backend installé contient déjà ces entrées, un ancien processus en mémoire ou une autre copie du projet doit être recherché avant toute autre modification. Une feuille CSS accessible ne prouve pas que les nouveaux modules sont autorisés.

L’import statique des bilans dans l’interface 2.5.0 échoue sur ce 404 avant l’exécution du rendu, ce qui explique `#app` vide. Le correctif de démarrage 2.5.1 réduit ce risque mais ne remplace pas la correction des routes réellement utilisées.

L’environnement cloud n’a pas accès au PC Windows ni à son processus Node. Les contrôles ci-dessous doivent être exécutés sur ce PC. Aucun paramètre Windows, Tailscale ou de données n’est modifié par ces instructions.

## Fichiers fournis

- `scripts/repair-static-routes.js` : diagnostic et correction minimale du fichier backend déjà installé. Il ajoute exclusivement les deux entrées ci-dessus si elles manquent, sans remplacer le reste du serveur. Si elles existent, il ne réécrit rien.
- `tests/static-imports.test.js` : contrôle HTTP automatique du graphe des imports et tests de sécurité de la réparation.
- Le présent guide.

Il n’est pas nécessaire de remplacer les fichiers de la base, la configuration, les résidents, les comptes, les bilans, les modèles ou les transmissions. Aucun fichier de démarrage n’est fourni ou modifié. Aucun changement de version du projet n’est imposé.

## 1. Identifier la copie réellement utilisée

Ouvrir PowerShell sur le PC avec **le compte Windows habituel de l’application**. Ne pas lancer une seconde instance du serveur.

```powershell
$ErrorActionPreference = 'Stop'
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$project = (Resolve-Path -LiteralPath $config.project).Path
$task = Get-ScheduledTask -TaskName 'InfinityTherapyDemo'
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
$taskSid = if ($task.Principal.UserId -match '^S-1-') {
  $task.Principal.UserId
} else {
  ([System.Security.Principal.NTAccount]::new($task.Principal.UserId)).Translate([System.Security.Principal.SecurityIdentifier]).Value
}
if ($taskSid -ne $identity.User.Value) { throw 'La tache utilise un autre compte Windows. Reprendre avec ce compte : ne pas modifier la configuration.' }
$project
$task.Actions | Format-List Execute,Arguments,WorkingDirectory
$task.Principal | Select-Object UserId
Get-Item -LiteralPath (Join-Path $project 'server.js'), (Join-Path $project 'backend\server.js'), (Join-Path $project 'src\assessments.js'), (Join-Path $project 'src\assessments-domain.js') | Select-Object FullName,Length,LastWriteTime
Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,OwningProcess
```

Avec l’installation fournie, l’action de la tâche lance `start-windows.ps1`. Ce script lit le `config.json` du compte Windows de la tâche, fait `Set-Location $config.project`, puis exécute `node server.js`. **Le dossier `$project` affiché doit donc être celui où se trouvent les fichiers mis à jour.** Le script indiqué dans l’action peut être dans une ancienne copie ; vérifier qu’il utilise toujours cette logique avant de continuer. Ne pas enregistrer ou recréer la tâche.

Pour identifier le processus qui écoute sur le port configuré :

```powershell
$listener = Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)" | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine
}
```

Une ligne de commande relative `node server.js` ne prouve pas à elle seule le dossier de travail. Le redémarrage contrôlé de la tâche, puis la comparaison des fichiers servis ci-dessous, permettent de vérifier le contenu effectivement utilisé. Ne pas arrêter globalement tous les processus Node, qui peuvent appartenir à d’autres logiciels.

Si les modules existent dans un autre dossier mais pas dans `$project`, ne pas modifier `config.json` pour contourner le problème : placer les fichiers de la bonne version dans le projet déjà configuré. L’outil refusera de corriger une copie dépourvue des deux modules.

## 2. Copier uniquement l’outil et le test

Extraire l’archive de correction, par exemple dans `C:\Temp\Infinity-static-fix`. Adapter uniquement cette variable :

```powershell
$fix = 'C:\Temp\Infinity-static-fix'
Copy-Item -LiteralPath (Join-Path $fix 'scripts\repair-static-routes.js') -Destination (Join-Path $project 'scripts\repair-static-routes.js')
Copy-Item -LiteralPath (Join-Path $fix 'tests\static-imports.test.js') -Destination (Join-Path $project 'tests\static-imports.test.js')
& $config.node (Join-Path $project 'scripts\repair-static-routes.js') --project $project
if ($LASTEXITCODE -ne 0) { throw 'Diagnostic refuse : arreter ici et examiner le message.' }
```

Le premier appel est en lecture seule. Il affiche le dossier et le fichier contrôlés, puis indique si les routes manquent. Il ne démarre pas le serveur et n’importe pas le code de la base.

Si ces noms d’outil/test existent déjà et ont été personnalisés, conserver leur copie avant remplacement. Aucun autre fichier n’est à recopier depuis cette archive.

## 3. Arrêter, corriger uniquement si nécessaire, puis tester

Fermer les onglets en cours de saisie après sauvegarde volontaire des formulaires. Arrêter seulement la tâche existante :

```powershell
Stop-ScheduledTask -TaskName 'InfinityTherapyDemo'
for ($i = 0; $i -lt 10; $i++) {
  if (!(Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Milliseconds 500
}
if (Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue) {
  throw 'Le port est encore ouvert : fermer le serveur Infinity Therapy manuel identifie, sans tuer les autres logiciels Node.'
}
$backupDirectory = Join-Path $env:LOCALAPPDATA 'InfinityTherapyCodeBackups'
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$backupFile = Join-Path $backupDirectory ('backend-server-before-static-fix-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.js')
& $config.node (Join-Path $project 'scripts\repair-static-routes.js') --project $project --apply --port $config.port --backup $backupFile
if ($LASTEXITCODE -ne 0) { throw 'Correction refusee : ne pas continuer.' }
Set-Location -LiteralPath $project
& $config.node --check .\backend\server.js
if ($LASTEXITCODE -ne 0) { throw 'Syntaxe du serveur invalide : restaurer le code sauvegarde.' }
& $config.node --test .\tests\static-imports.test.js
if ($LASTEXITCODE -ne 0) { throw 'Tests statiques echoues : conserver le serveur arrete et examiner le resultat.' }
```

L’outil sauvegarde le contenu initial du fichier de code avant de modifier la liste ; il refuse un format inconnu, une correspondance ambiguë ou une route existante pointant vers un autre fichier. Il refuse également une correction si le port est encore ouvert. Il ne touche ni au répertoire de données ni aux règles métier. Si les deux routes sont déjà là, aucune écriture ni nouvelle sauvegarde du code n’a lieu : le redémarrage est alors l’action essentielle.

Le test démarre un serveur sur un **port temporaire** et une **base temporaire fictive**, puis les ferme et nettoie. Il n’ouvre pas la base du cabinet. Aucun package à installer.

## 4. Redémarrer la même tâche et vérifier les réponses réelles

```powershell
Start-ScheduledTask -TaskName 'InfinityTherapyDemo'
Start-Sleep -Seconds 2
$base = 'http://127.0.0.1:' + $config.port
$modules = @('app.js','domain.js','store.js','demo-store.js','assessments.js','assessments-domain.js')
foreach ($module in $modules) {
  $url = $base + '/src/' + $module + '?v=2.5.0'
  $response = Invoke-WebRequest -UseBasicParsing -Uri $url
  if ($response.StatusCode -ne 200 -or $response.Headers['Content-Type'] -notmatch '^(text|application)/javascript(;|$)') {
    throw "Module non servi correctement : $module"
  }
  Write-Host "$module : HTTP 200, $($response.Headers['Content-Type'])"
}
```

Comparer aussi les octets du module servi avec ceux du dossier attendu, pour ne pas se fier seulement au nom de version :

```powershell
$client = [System.Net.WebClient]::new()
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
  foreach ($module in $modules) {
    $bytes = $client.DownloadData($base + '/src/' + $module + '?v=2.5.0')
    $servedHash = [System.BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','')
    $diskHash = (Get-FileHash -LiteralPath (Join-Path $project ('src\' + $module)) -Algorithm SHA256).Hash
    if ($servedHash -ne $diskHash) { throw "Le serveur ne fournit pas le fichier attendu : $module" }
    Write-Host "$module : contenu identique au projet configure"
  }
} finally {
  $sha.Dispose()
  $client.Dispose()
}
```

Dans Chrome, vérifier ensuite, sur **la même adresse Tailscale** :

- `https://pc-bureau.taild1b1f2.ts.net/src/assessments.js?v=2.5.0`
- `https://pc-bureau.taild1b1f2.ts.net/src/assessments-domain.js?v=2.5.0`

Les deux doivent afficher du JavaScript, et non le JSON « Introuvable ». Recharger la page principale avec Ctrl+Maj+R, puis vérifier les requêtes dans l’onglet Réseau de Chrome. Ne pas effacer le stockage du navigateur, réinitialiser une base, recréer les comptes ou reconfigurer Tailscale.

Si le contrôle local passe mais que l’adresse Tailscale échoue, les deux accès peuvent viser des processus différents. Relever le port configuré et le processus à l’écoute pour diagnostic ; **ne pas changer les paramètres Tailscale**. Si une API des bilans manque encore après le rétablissement des modules, cela constitue une autre installation partielle du code métier ; ce correctif de routes ne remplace pas les API ni ne lance une migration pour la masquer.

## Retour arrière du code

Seulement si l’outil a réellement modifié le fichier et créé `$backupFile` : arrêter la même tâche, vérifier que le port est fermé, copier `$backupFile` sur `$project\backend\server.js`, puis relancer la tâche existante. Aucune restauration de base n’est nécessaire ou souhaitable pour ce correctif.

## Résultats exécutés dans le cloud

- `node --test tests/static-imports.test.js` : **3 tests réussis**, 0 échec. Graphe des six imports, HTTP 200/MIME JavaScript/contenu exact, requêtes sans version et avec `?v=2.5.0`, répertoire courant différent, refus d’exposition des fichiers privés ; réparation limitée aux deux entrées, refus d’un serveur actif, sauvegarde, idempotence et sentinelle persistante conservée.
- `npm test` : **22 tests existants réussis**, 0 échec.
- Aucun code de base, d’authentification, de bilan, de transmission ou de démarrage Windows modifié.
- Les commandes PowerShell et la remise en service du PC réel ne peuvent pas être exécutées depuis cet environnement Linux. Les résultats locaux Windows doivent être vérifiés par les commandes ci-dessus.
