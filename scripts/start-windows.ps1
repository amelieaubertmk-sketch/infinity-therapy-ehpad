$ErrorActionPreference = 'Stop'
$config = Get-Content (Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json') -Raw | ConvertFrom-Json
$env:INFINITY_DATA_DIR = $config.dataDir
$env:INFINITY_ORIGIN = $config.origin
$env:PORT = [string]$config.port
Set-Location $config.project
& $config.node server.js
exit $LASTEXITCODE
