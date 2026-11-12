# Installation Windows 11 — Infinity Therapy 2.6.0

Livraison complète du module Bilans compact, de sa corbeille et du suivi manuel Titan. Compatible avec les données existantes 2.5.0/2.5.1. Ne pas remplacer la base SQLite ni la configuration. Ne pas déployer par simple remplacement de quelques fichiers : le nouveau module clinique doit être installé et autorisé par le serveur Node.

Le dossier réellement utilisé est celui indiqué par `%LOCALAPPDATA%\InfinityTherapyDemo\config.json`, propriété `project`, pour le compte Windows de la tâche planifiée. Vérifier qu’il correspond au dossier mis à jour avant de remplacer le code. Le point d’entrée `server.js`, les ports, Tailscale et les scripts de démarrage restent inchangés.

## Avant l’installation

Utiliser le même compte Windows qui a configuré Infinity Therapy. Prévoir une interruption de saisie et fermer les onglets sur les iPhones. Ne pas exécuter `configure-windows.ps1`, de création/réinitialisation de compte, de restauration, ou « Supprimer tous les résidents ». Ne pas modifier Tailscale Serve, l’adresse HTTPS, le port ou les règles d’accès.

Le logiciel reste soumis aux limites documentées dans [SECURITE.md](SECURITE.md) : cette évolution ne certifie pas son usage pour des données de santé réelles. La base et les exports ne sont pas chiffrés par l’application. Utiliser un disque et des sauvegardes chiffrés, un compte Windows protégé et l’accès HTTPS privé Tailscale. Aucun texte médical, observation, motif ou modèle n’est inclus dans les exports. Même les codes résidents et dates restent confidentiels.

Télécharger l’archive `infinity-therapy-2.6.0.zip` fournie avec cette livraison sur le PC. L’extraire dans un dossier temporaire, par exemple `C:\InfinityTherapy-release-2.6.0`. Ce dossier doit contenir directement `package.json`, `server.js`, `src`, `backend`, `scripts`, `tests` et `docs`.

## Sauvegarde et remplacement du code

Ouvrir PowerShell avec le compte Windows habituel. Adapter uniquement `$release` et `$backupRoot`. `$backupRoot` doit désigner un emplacement privé chiffré accessible, hors du dossier de l’application et de celui des données. Exécuter par étapes et s’arrêter au premier message d’erreur.

```powershell
$ErrorActionPreference = 'Stop'
$release = 'C:\InfinityTherapy-release-2.6.0'
$backupRoot = 'E:\SauvegardesInfinity'
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$project = $config.project
$env:INFINITY_DATA_DIR = $config.dataDir
if (!(Test-Path (Join-Path $config.dataDir 'demo.sqlite'))) { throw 'Base existante introuvable : ne pas démarrer.' }
if ((Get-Content (Join-Path $release 'package.json') -Raw | ConvertFrom-Json).version -ne '2.6.0') { throw 'Archive incorrecte.' }
& $config.node --version
# Node doit être >= 24.13.0.
Stop-ScheduledTask -TaskName 'InfinityTherapyDemo'
Get-ScheduledTask -TaskName 'InfinityTherapyDemo' | Select-Object TaskName,State
```

Vérifier que la tâche est arrêtée et fermer tout serveur Infinity Therapy lancé manuellement. Ne pas arrêter les autres logiciels Node. Aucun processus Infinity Therapy ne doit écrire pendant la copie des données. Puis :

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupRoot "avant-2.6.0-$stamp"
New-Item -ItemType Directory -Path $backup | Out-Null
Copy-Item -LiteralPath $configPath -Destination (Join-Path $backup 'config.json')
Copy-Item -LiteralPath $config.dataDir -Destination (Join-Path $backup 'donnees') -Recurse
Copy-Item -LiteralPath $project -Destination (Join-Path $backup 'code') -Recurse
# Vérifier l’intégrité de la COPIE, en lecture seule, sans migration :
$checkScript = Join-Path $backup 'verifier-sauvegarde.mjs'
@'
import {DatabaseSync} from 'node:sqlite';
const db = new DatabaseSync(process.argv[2], {readOnly:true});
try {
  if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw Error('Sauvegarde invalide');
  console.log('Integrite OK', db.prepare('SELECT count(*) AS comptes FROM users').get());
} finally { db.close(); }
'@ | Set-Content -Encoding UTF8 $checkScript
& $config.node $checkScript (Join-Path $backup 'donnees\demo.sqlite')
if ($LASTEXITCODE -ne 0) { throw 'Sauvegarde non validée : ne pas poursuivre.' }
# Garder le chemin $backup pour un éventuel retour arrière.
$backup
```

Contrôler la présence de la copie complète (y compris les éventuels fichiers `demo.sqlite-wal` et `demo.sqlite-shm`). Ne jamais copier uniquement le fichier principal d’une base en cours d’utilisation. Conserver cette sauvegarde et les anciennes sauvegardes.

## Remplacer le code après sauvegarde validée

Garder le serveur arrêté. Les données doivent être en dehors des répertoires de code ci-dessous. Ne pas exécuter de script de configuration, de création/réinitialisation de compte ou de réinstallation du démarrage automatique.

```powershell
foreach ($dir in @('backend','src','assets','tests','docs')) {
  $target = Join-Path $project $dir
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Copy-Item -Path (Join-Path $release "$dir\*") -Destination $target -Recurse -Force
}
# Copie du seul outil de test statique ; aucun script de démarrage n’est remplacé.
Copy-Item -LiteralPath (Join-Path $release 'scripts\repair-static-routes.js') -Destination (Join-Path $project 'scripts\repair-static-routes.js') -Force
foreach ($file in @('index.html','package.json','README.md')) {
  Copy-Item -LiteralPath (Join-Path $release $file) -Destination (Join-Path $project $file) -Force
}
Set-Location -LiteralPath $project
& $config.node --test tests/domain.test.js tests/api.test.js tests/retention.test.js tests/bulk.test.js tests/assessments.test.js tests/assessments-compact.test.js tests/static-imports.test.js
if ($LASTEXITCODE -ne 0) { throw 'Tests echoues : garder le serveur arrete et examiner le rapport.' }
Start-ScheduledTask -TaskName 'InfinityTherapyDemo'
```

Aucun `npm install` nécessaire. Les polices dans `assets/fonts` sont indispensables au serveur PDF ; aucune police n’est téléchargée en fonctionnement. Les tests serveur utilisent exclusivement des bases temporaires fictives. Ils nécessitent les ports locaux de test 31002, 31003, 31006 et 31009 disponibles. Les vérifications PDF supplémentaires utilisent `pdfinfo`/`pdftotext` lorsqu’ils sont disponibles. Ces outils sont des outils de développement, pas des dépendances de production ; leur absence est signalée explicitement et ne bloque pas les tests métier/serveur. Les vérifications PDF complètes ont été réalisées dans le cloud Linux. Les suites navigateur et les outils PDF ont été exécutés dans le cloud.

La modification de schéma est **additive et automatique** : tables de suivi, versions et documents de bilans. Aucune ancienne colonne ni valeur n’est supprimée, aucun ancien bilan n’est converti. Le SQL de documentation est dans `MIGRATION-BILANS-2.6.0.sql` ; il n’est pas nécessaire de l’exécuter manuellement. Les sauvegardes SQLite complètes incluent ces tables et leurs PDF. Les règles existantes des transmissions restent inchangées.

## Vérifications obligatoires après redémarrage

Ouvrir la même adresse HTTPS Tailscale et recharger complètement la page (Ctrl+Maj+R sur PC ; fermer/rouvrir la page sur iPhone). Vérifier **Version 2.6.0**.

Sur le PC, vérifier le nouveau fichier et son type MIME :

```powershell
$response = Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:' + $config.port + '/src/assessments-compact.js?v=2.6.0')
$response.StatusCode
$response.Headers['Content-Type']
```

Attendu : 200 et `text/javascript; charset=utf-8`. Vérifier aussi `/src/assessments.js?v=2.6.0` et `/src/assessments-domain.js?v=2.6.0`. Si l’un renvoie le JSON « Introuvable », vérifier le dossier configuré et le redémarrage du processus ; **ne pas réinitialiser une base et ne pas modifier Tailscale**. L’ancien petit correctif statique 2.5.x ne remplace pas l’installation complète de 2.6.0.

Vérifier les comptes, résidents, modèles et transmissions. Dans Bilans résidents, consulter un ancien bilan sans le modifier, créer uniquement un brouillon fictif si un essai est nécessaire, vérifier les rubriques facultatives, puis supprimer et restaurer ce brouillon. Ne pas modifier des données réelles pour tester.

Un bilan validé apparaît dans Bilans à saisir sur Titan ; ouvrir le bon PDF après confirmation du résident et vérifier qu’aucun identifiant patient n’apparaît. Le téléchargement seul doit laisser le bilan en attente. Après import manuel, confirmer séparément la saisie ; le document reste dans l’historique, avec son PDF.

## Retour arrière sans perte de données

Arrêter la même tâche et tout serveur manuel. Faire une **nouvelle sauvegarde complète des données actuelles**, qui peuvent contenir de nouveaux bilans, PDF, suppressions logiques et confirmations Titan depuis l’installation.

Restaurer uniquement les dossiers et fichiers de code remplacés depuis `$backup\code`, puis relancer la même tâche. Ne pas remplacer `demo.sqlite`, supprimer les nouvelles tables ou lancer de conversion inverse. Les données nouvelles restent dans SQLite et seront retrouvées en remettant la version 2.6.0.

Attention : une ancienne interface ne connaît pas le nouveau format compact, la corbeille des bilans ni le suivi Titan ; elle ne permet pas d’exploiter ces nouvelles fonctions et peut réafficher comme actifs des brouillons dont elle ignore le suivi logique. **Ne pas utiliser le module Bilans avec l’ancienne version pendant le retour arrière.** Exporter les PDF finalisés nécessaires avant une rétrogradation planifiée, puis réinstaller 2.6.0 pour reprendre leur suivi. Les transmissions restent indépendantes.

Restaurer une base sauvegardée avant installation ferait perdre toutes les écritures postérieures : ne jamais le faire automatiquement. Une telle restauration nécessite une décision explicite du cabinet après sauvegarde de l’état courant et prise en compte de toutes les nouvelles données.

## Documents fournis

- `BILANS-RESIDENTS-2.6.0.md` : utilisation, droits, références, confidentialité et limites.
- `VALIDATION-2.6.0.md` : tests, fichiers modifiés et limites de validation.
- `MIGRATION-BILANS-2.6.0.sql` : schéma additif documenté.

Aucune installation Windows, modification Tailscale ou publication automatique du serveur du cabinet n’a été réalisée depuis le cloud.
