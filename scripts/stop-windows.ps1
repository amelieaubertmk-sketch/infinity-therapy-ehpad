$ErrorActionPreference = 'Stop'
Stop-ScheduledTask -TaskName 'InfinityTherapyDemo'
Write-Host 'Tâche arrêtée. Vérifiez dans le Gestionnaire des tâches qu’aucun serveur Node Infinity Therapy manuel ne tourne avant une restauration.'
