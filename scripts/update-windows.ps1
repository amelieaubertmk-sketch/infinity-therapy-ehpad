# Run from the extracted 2.6.2 archive, using the account of the scheduled task.
param(
  [string]$BackupRoot = (Join-Path $env:LOCALAPPDATA 'InfinityTherapyBackups'),
  [string]$TaskName = 'InfinityTherapyDemo'
)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath (Split-Path $PSScriptRoot -Parent)).Path
$manifestPath = Join-Path $PSScriptRoot 'bilans-runtime-manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.release -ne '2.6.2' -or !$manifest.runtime) { throw 'Extraire la livraison complete Infinity Therapy 2.6.2.' }
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$project = (Resolve-Path -LiteralPath $config.project).Path
$data = (Resolve-Path -LiteralPath $config.dataDir).Path
if (!(Test-Path -LiteralPath (Join-Path $data 'demo.sqlite') -PathType Leaf)) { throw 'Base existante introuvable dans dataDir. Mise a jour interrompue.' }
$port = [int]$config.port
if ($port -lt 1 -or $port -gt 65535) { throw 'Port invalide dans config.json.' }
& $config.node -e 'const [major, minor] = process.versions.node.split(String.fromCharCode(46)).map(Number); if (major < 24 || (major === 24 && minor < 13)) process.exit(1);'
if ($LASTEXITCODE -ne 0) { throw 'Node.js 24.13.0 ou plus recent est requis.' }

$task = Get-ScheduledTask -TaskName $TaskName
$account = $task.Principal.UserId
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$accountSid = if ($account -match '^S-1-') { $account } else {
  (New-Object Security.Principal.NTAccount($account)).Translate([Security.Principal.SecurityIdentifier]).Value
}
if ($identity.User.Value -ne $accountSid) { throw 'Ouvrir PowerShell avec le compte Windows de la tache existante.' }
if ($task.Actions.Count -ne 1 -or $task.Actions[0].Execute -notmatch '(?i)(?:^|[\\/])(?:powershell|pwsh)(?:\.exe)?$') {
  throw 'La tache doit avoir une seule action PowerShell. Verifier le demarrage existant avant la mise a jour.'
}
$arguments = $task.Actions[0].Arguments
if ($arguments -match '(?i)(?:^|\s)-File\s+"([^"]+start-windows\.ps1)"\s*$') {
  $startup = Get-Content -LiteralPath $Matches[1] -Raw
  if (!$startup.Contains('$config.project') -or !$startup.Contains('$config.node server.js') -or !$startup.Contains('InfinityTherapyDemo\config.json')) {
    throw 'Le script de demarrage ne charge pas le projet de config.json. Mise a jour interrompue.'
  }
} elseif ($arguments -match '(?i)^\s*(?:(?:-NoProfile|-NonInteractive)\s+)*-EncodedCommand\s+(?<quote>"?)(?<payload>[A-Za-z0-9+/]+={0,2})\k<quote>\s*$') {
  try { $startup = [Text.Encoding]::Unicode.GetString([Convert]::FromBase64String($Matches['payload'])) }
  catch { throw 'La commande encodee de la tache ne peut pas etre lue. Mise a jour interrompue.' }
  $expectedStartup = @'
$ErrorActionPreference = 'Stop'
$config = Get-Content "$env:LOCALAPPDATA\InfinityTherapyDemo\config.json" -Raw | ConvertFrom-Json
$env:INFINITY_DATA_DIR = $config.dataDir
$env:INFINITY_ORIGIN = $config.origin
$env:PORT = [string]$config.port
Set-Location $config.project
& $config.node server.js
exit $LASTEXITCODE
'@
  # Compare text only. The decoded command is never evaluated by this updater.
  $normalized = ($startup -split '\r?\n' | ForEach-Object { $_.Trim() } | Where-Object { $_ }) -join "`n"
  if ($normalized -ne ($expectedStartup -replace '\r\n', "`n")) {
    throw 'La commande encodee ne correspond pas au lanceur Infinity Therapy qui utilise config.json. Mise a jour interrompue.'
  }
} else {
  throw 'Le mode de demarrage PowerShell de la tache est inconnu. Mise a jour interrompue.'
}

$files = @($manifest.files.PSObject.Properties)
foreach ($file in $files) {
  if ($file.Name -notmatch '^(?:server\.js|package\.json|index\.html|(?:src|backend|assets/fonts)/[\w.-]+)$' -or $file.Name.Contains('..')) {
    throw "Chemin non autorise dans le manifeste : $($file.Name)"
  }
  $inputFile = Join-Path $source $file.Name
  if (!(Test-Path -LiteralPath $inputFile -PathType Leaf) -or (Get-FileHash -LiteralPath $inputFile -Algorithm SHA256).Hash -ne $file.Value.sha256) {
    throw "Archive incomplete ou modifiee : $($file.Name)"
  }
}
$backupBase = [IO.Path]::GetFullPath($BackupRoot).TrimEnd('\')
foreach ($directory in @($project, $data)) {
  $prefix = [IO.Path]::GetFullPath($directory).TrimEnd('\')
  if ($backupBase -eq $prefix -or $backupBase.StartsWith($prefix + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Choisir un dossier de sauvegarde prive hors du projet et des donnees.'
  }
}
Write-Host "Projet utilise par la tache : $project"
Stop-ScheduledTask -TaskName $TaskName
for ($i = 0; $i -lt 10; $i++) {
  if (!(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)) { break }
  Start-Sleep -Seconds 1
}
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
  throw 'Le port ecoute encore. Fermer le serveur Infinity Therapy eventuellement lance a la main. Aucun fichier remplace.'
}

$backup = Join-Path $backupBase ('avant-2.6.2-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath $data -Destination (Join-Path $backup 'donnees') -Recurse
Copy-Item -LiteralPath $configPath -Destination (Join-Path $backup 'config.json')
$backupDb = Join-Path $backup 'donnees\demo.sqlite'
if ((Get-FileHash -LiteralPath $backupDb -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath (Join-Path $data 'demo.sqlite') -Algorithm SHA256).Hash) {
  throw 'La copie de la base ne correspond pas au fichier source. Aucun code remplace.'
}
foreach ($file in $files) {
  $target = Join-Path $project $file.Name
  if (Test-Path -LiteralPath $target -PathType Leaf) {
    $savedCode = Join-Path (Join-Path $backup 'code') $file.Name
    New-Item -ItemType Directory -Path (Split-Path $savedCode -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $target -Destination $savedCode
  }
}
Write-Host "Sauvegarde privee : $backup"

try {
  foreach ($file in $files) {
    $target = Join-Path $project $file.Name
    if ($project -ne $source) {
      New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
      Copy-Item -LiteralPath (Join-Path $source $file.Name) -Destination $target -Force
    }
    if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $file.Value.sha256) { throw "Copie non verifiee : $($file.Name)" }
  }
  Start-ScheduledTask -TaskName $TaskName
  $base = 'http://127.0.0.1:' + $port
  $runtime = $null
  for ($i = 0; $i -lt 15; $i++) {
    try { $runtime = Invoke-RestMethod -Uri ($base + '/api/assessment-runtime') -TimeoutSec 2; break }
    catch { Start-Sleep -Seconds 1 }
  }
  if ($runtime.api -ne $manifest.release -or $runtime.rules -ne $manifest.release -or $runtime.pdf -ne $manifest.release) {
    throw 'Le processus qui repond sur le port configure ne confirme pas la version 2.6.2.'
  }
  $diagnostic = & $config.node (Join-Path $PSScriptRoot 'diagnose-bilans.js') --project $project --base $base --manifest $manifestPath
  if ($LASTEXITCODE -ne 0) { throw 'Le diagnostic du serveur a echoue.' }
  $report = ($diagnostic -join [Environment]::NewLine) | ConvertFrom-Json
  if (!$report.runtime.matches -or @($report.http | Where-Object { $_.status -ne 200 -or !$_.javascript -or !$_.matchesDisk }).Count -gt 0) {
    throw 'Les modules HTTP ne correspondent pas au projet mis a jour.'
  }
} catch {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  throw ("Mise a jour non verifiee. Tache arretee. Sauvegarde : " + $backup + ". " + $_.Exception.Message)
}
Write-Host 'Infinity Therapy 2.6.2 verifiee : API, regles, PDF et modules HTTP.'
Write-Host 'Ouvrir votre adresse habituelle, actualiser la page et verifier Version 2.6.2 en bas de page.'
