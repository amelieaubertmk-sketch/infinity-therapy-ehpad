# Run in PowerShell as the same Windows user who configured the application.
$ErrorActionPreference = 'Stop'
$script = Join-Path $PSScriptRoot 'start-windows.ps1'
if (!(Test-Path (Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'))) { throw 'Exécutez configure-windows.ps1 avant cette étape.' }
$credential = Get-Credential -UserName "$env:USERDOMAIN\$env:USERNAME" -Message 'Mot de passe du compte Windows (pas le code PIN). Il est transmis au Planificateur Windows, pas enregistré par ce script.'
if (!$credential) { throw 'Installation annulée.' }
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy RemoteSigned -File `"$script`"" -WorkingDirectory (Split-Path $PSScriptRoot -Parent)
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 10 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'InfinityTherapyDemo' -Action $action -Trigger $trigger -Settings $settings -User $credential.UserName -Password $credential.GetNetworkCredential().Password -RunLevel Limited -Description 'Serveur privé de démonstration Infinity Therapy, données fictives.' | Out-Null
Write-Host 'Tâche installée. Fermez un éventuel serveur manuel puis lancez : Start-ScheduledTask -TaskName InfinityTherapyDemo'
