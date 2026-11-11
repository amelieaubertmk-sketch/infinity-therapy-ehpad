# Mise à jour Windows 11 — Infinity Therapy 2.4.1

Mise à jour depuis 2.4.0 : seules l’interface, ses styles, les références de cache et le numéro de version changent. Aucun changement serveur, de schéma SQLite, de règle de conservation ou de Tailscale. La sélection multiple, l’export local et la corbeille sont proposés dans l’historique uniquement. Le suivi administratif Boss utilise la même présentation d’historique.

## Avant l’installation

Utiliser le même compte Windows qui a configuré Infinity Therapy. Prévoir une interruption de saisie et fermer les onglets sur les iPhones. Ne pas exécuter `configure-windows.ps1`, de création/réinitialisation de compte, de restauration, ou « Supprimer tous les résidents ». Ne pas modifier Tailscale Serve, l’adresse HTTPS, le port ou les règles d’accès.

Le logiciel reste soumis aux limites documentées dans [SECURITE.md](SECURITE.md) : cette évolution ne certifie pas son usage pour des données de santé réelles. La base et les exports ne sont pas chiffrés par l’application. Utiliser un disque et des sauvegardes chiffrés, un compte Windows protégé et l’accès HTTPS privé Tailscale. Aucun texte médical, observation, motif ou modèle n’est inclus dans les exports. Même les codes résidents et dates restent confidentiels.

Télécharger l’archive `infinity-therapy-2.4.1.zip` fournie avec cette livraison sur le PC. L’extraire dans un dossier temporaire, par exemple `C:\InfinityTherapy-release-2.4.1`. Ce dossier doit contenir directement `package.json`, `server.js`, `src`, `backend`, `scripts`, `tests` et `docs`.

## Sauvegarde et remplacement du code

Ouvrir PowerShell avec le compte Windows habituel. Adapter uniquement `$release` et `$backupRoot`. `$backupRoot` doit désigner un emplacement privé chiffré accessible, hors du dossier de l’application et de celui des données. Exécuter par étapes et s’arrêter au premier message d’erreur.

```powershell
$ErrorActionPreference = 'Stop'
$release = 'C:\InfinityTherapy-release-2.4.1'
$backupRoot = 'E:\SauvegardesInfinity'
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$project = $config.project
$env:INFINITY_DATA_DIR = $config.dataDir
if (!(Test-Path (Join-Path $config.dataDir 'demo.sqlite'))) { throw 'Base existante introuvable : ne pas démarrer.' }
if ((Get-Content (Join-Path $release 'package.json') -Raw | ConvertFrom-Json).version -ne '2.4.1') { throw 'Archive incorrecte.' }
& $config.node --version
# Node doit être >= 24.13.0.
Stop-ScheduledTask -TaskName 'InfinityTherapyDemo'
Get-ScheduledTask -TaskName 'InfinityTherapyDemo' | Select-Object TaskName,State
```

Vérifier que la tâche est arrêtée et fermer tout serveur Infinity Therapy lancé manuellement. Ne pas arrêter les autres logiciels Node. Aucun processus Infinity Therapy ne doit écrire pendant la copie des données. Puis :

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupRoot "avant-2.4.1-$stamp"
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

## Remplacer uniquement les fichiers nécessaires

Après la sauvegarde validée ci-dessus, conserver le serveur arrêté et exécuter :

```powershell
foreach ($file in @('index.html','package.json','src\app.js','src\style.css')) {
  Copy-Item -LiteralPath (Join-Path $release $file) -Destination (Join-Path $project $file) -Force
}
Start-ScheduledTask -TaskName 'InfinityTherapyDemo'
```

Aucun `npm install`, aucune configuration de compte, aucune restauration de base à effectuer. Ne pas remplacer `config.json`, les fichiers SQLite ni les paramètres de la tâche planifiée. Pour une installation plus ancienne que 2.4.0, appliquer d’abord la [procédure complète 2.4.0](MISE-A-JOUR-2.4.md).

Ouvrir l’adresse Tailscale habituelle. Recharger complètement la page sur PC (Ctrl+Maj+R) et sur iPhone (fermer/rouvrir la page). Vérifier **Version 2.4.1**. Les références de cache des fichiers ont été actualisées.

## Vérifications après installation

- Vérifier comptes, résidents, modèles, transmissions et synchronisation PC/iPhone sur l’adresse privée existante.
- Transmissions à saisir : pas de sélection ni export ni accès corbeille ; dates exactes et badges jaune aujourd’hui, orange hier, rouge antérieures ; dates les plus anciennes en premier.
- Historique : dates françaises neutres ; dates les plus récentes en premier ; sélection et export Excel local. Suppression groupée et corbeille visibles uniquement pour l’administratrice. « Supprimer la sélection » déplace toujours vers la corbeille après confirmation.
- Regroupement activé : AMÉLIE sur rose #FCE7F1, ALEXANDRE sur bleu #E2F1FF, nombre de lignes filtrées par groupe et ordre chronologique interne. Dans les transmissions à saisir, seuls les en-têtes de groupe prennent ces fonds ; les badges de dates restent prioritaires. Dans l’historique, les lignes du groupe prennent aussi le fond pastel.
- Désactiver le regroupement : fonds de groupe supprimés. Vérifier filtres et recherche. Ne jamais utiliser un résident réel pour un essai de suppression.

## Retour arrière

Arrêter la tâche et tout serveur manuel. Recopier uniquement `index.html`, `package.json`, `src\app.js` et `src\style.css` depuis `$backup\code` aux mêmes emplacements de `$project`, puis relancer la tâche. Ne pas restaurer la base : cette mise à jour ergonomique n’en modifie pas le schéma, et les saisies effectuées après la mise à jour doivent rester conservées.

## Tests de livraison

Sur Linux et Node.js 24.22.1 : `npm test` (20 tests métier/serveur), `tests/private-browser.mjs` (parcours existants et synchronisation), `tests/bulk-browser.mjs` (export/corbeille/restauration), `tests/ergonomics-browser.mjs` (ordinateur et iPhone 13 simulé sous Chromium, trois rôles). Préfixer les commandes navigateur par `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node` dans l’environnement cloud utilisé.

Les tests ergonomiques vérifient les couleurs CSS calculées, les compteurs des groupes, le tri dans les deux sens, les filtres, la disparition des actions dans les attentes, les actions autorisées dans l’historique, les changements de regroupement et l’absence d’écriture en base. Les contrôles d’autorisation serveur existants sont retestés par `npm test`. Aucun code serveur n’est changé.

Un iPhone physique/Safari, Microsoft Excel et les scripts PowerShell n’ont pas été exécutés dans cet environnement Linux ; leurs vérifications sur le matériel du cabinet restent nécessaires. La simulation mobile ne remplace pas un essai Safari réel. Aucun déploiement Windows ni publication GitHub de 2.4.1 n’a été réalisé par cette livraison.
