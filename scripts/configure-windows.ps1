$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo'
New-Item -ItemType Directory -Force -Path $runtime | Out-Null
$config = Join-Path $runtime 'config.json'
if (Test-Path $config) { throw 'Configuration déjà présente. Modifiez config.json pour changer l’adresse, sans écraser les données.' }
$origin = (Read-Host 'Adresse HTTPS Tailscale du PC (ex. https://cabinet.exemple.ts.net)').TrimEnd('/')
$uri = [Uri]$origin
if ($uri.Scheme -ne 'https' -or $uri.AbsolutePath -ne '/' -or $uri.Host -notlike '*.ts.net' -or $uri.Query -or $uri.Fragment) { throw 'Utilisez l’adresse HTTPS .ts.net donnée par Tailscale Serve.' }
@{origin=$origin;dataDir=$runtime;project=$project;port=3000;node=(Get-Command node).Source} | ConvertTo-Json | Set-Content -Encoding UTF8 $config
# Restrict the data directory to this Windows user and SYSTEM. No inherited broad ACL.
& icacls.exe $runtime /inheritance:r /grant:r "$($env:USERDOMAIN)\$($env:USERNAME):(OI)(CI)F" 'SYSTEM:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Impossible de limiter les droits du dossier de données.' }
$env:INFINITY_DATA_DIR = $runtime
Push-Location $project
try { & node scripts/admin.js create; if ($LASTEXITCODE -ne 0) { throw 'Création du compte échouée. Relancez le script de compte uniquement.' } } finally { Pop-Location }
Write-Host 'Configuration enregistrée. Démarrez avec scripts\start-windows.ps1.'
