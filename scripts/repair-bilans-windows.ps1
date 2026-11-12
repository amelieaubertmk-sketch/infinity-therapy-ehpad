# Execute manually, from the extracted repair archive, as the usual Windows account.
param(
  [Parameter(Mandatory=$true)][string]$BackupRoot,
  [string]$TaskName = 'InfinityTherapyDemo'
)
$ErrorActionPreference = 'Stop'
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$project = (Resolve-Path -LiteralPath $config.project).Path
$tool = Join-Path $PSScriptRoot 'repair-bilans-installation.js'
$task = Get-ScheduledTask -TaskName $TaskName
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
if ($task.Principal.UserId -match '^S-1-') {
  $taskSid = $task.Principal.UserId
} else {
  $principal = New-Object Security.Principal.NTAccount($task.Principal.UserId)
  $taskSid = $principal.Translate([Security.Principal.SecurityIdentifier]).Value
}
if ($identity.User.Value -ne $taskSid) { throw 'Utiliser le compte Windows de la tache existante. Aucune modification.' }
if ($task.Actions.Count -ne 1) { throw 'Action de demarrage inhabituelle : verification manuelle requise.' }
$arguments = $task.Actions[0].Arguments
if ($arguments -notmatch '(?i)-File\s+"([^"]+start-windows\.ps1)"\s*$') {
  throw 'La tache ne lance pas le script standard. Ne pas modifier le demarrage automatique ; verifier son action.'
}
$startup = Get-Content -LiteralPath $Matches[1] -Raw
if (!$startup.Contains('$config.project') -or !$startup.Contains('$config.node server.js') -or !$startup.Contains('InfinityTherapyDemo\config.json')) {
  throw 'Script de demarrage non reconnu. Aucune modification.'
}
Write-Host "Projet configure : $project"
Write-Host "Tache existante : $TaskName ; compte : $($task.Principal.UserId)"
# Validate before stopping or copying anything. This never opens SQLite.
& $config.node $tool --project $project
if ($LASTEXITCODE -ne 0) { throw 'Verification prealable refusee. Aucun fichier remplace.' }
if (!(Test-Path -LiteralPath (Join-Path $config.dataDir 'demo.sqlite'))) { throw 'Base existante introuvable. Ne pas poursuivre.' }
# Backup must be outside both the project and its persistent data directory.
$backupBase = [IO.Path]::GetFullPath($BackupRoot).TrimEnd('\')
foreach ($protected in @($project,$config.dataDir)) {
  $prefix = [IO.Path]::GetFullPath($protected).TrimEnd('\')
  if ($backupBase -eq $prefix -or $backupBase.StartsWith($prefix + '\',[StringComparison]::OrdinalIgnoreCase)) {
    throw 'Choisir un emplacement de sauvegarde hors du projet et des donnees.'
  }
}
Stop-ScheduledTask -TaskName $TaskName
for ($i=0; $i -lt 10; $i++) {
  if (!(Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Seconds 1
}
if (Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue) {
  throw 'Le port ecoute encore. Fermer uniquement le serveur Infinity lance manuellement, puis relancer. Aucun fichier modifie.'
}
$backup = Join-Path $backupBase ('reparation-bilans-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath $config.dataDir -Destination (Join-Path $backup 'donnees') -Recurse
Copy-Item -LiteralPath $configPath -Destination (Join-Path $backup 'config.json')
Write-Host "Sauvegarde privee : $backup"
& $config.node $tool --project $project --apply --port $config.port --backup (Join-Path $backup 'code')
if ($LASTEXITCODE -ne 0) { throw 'Reparation arretee. Le serveur reste arrete ; lire le message et conserver la sauvegarde.' }
Start-ScheduledTask -TaskName $TaskName
for ($i=0; $i -lt 15; $i++) {
  if (Get-NetTCPConnection -LocalPort $config.port -State Listen -ErrorAction SilentlyContinue) { break }
  Start-Sleep -Seconds 1
}
& $config.node $tool --project $project --verify --base ('http://127.0.0.1:' + $config.port)
if ($LASTEXITCODE -ne 0) { throw 'Le serveur reel ne sert pas les sept modules attendus. Conserver le rapport ; ne pas modifier SQLite ou Tailscale.' }
Write-Host 'Verification locale reussie : 7 modules HTTP 200, MIME JavaScript, contenu identique au projet configure.'
Write-Host 'Ouvrir votre adresse privee, Ctrl+Maj+R, puis Bilans residents. Aucun parametre de demarrage modifie.'
