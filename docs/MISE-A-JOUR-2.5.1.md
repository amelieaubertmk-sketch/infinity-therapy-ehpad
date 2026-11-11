# Infinity Therapy 2.5.1 — réparation d’une page blanche sur Windows 11

Cette archive complète s’installe sur 2.4.0, 2.5.0 ou une installation partielle de 2.5.0. Elle regroupe les ajustements ergonomiques des transmissions et le module indépendant **Bilans résidents**. Aucune installation intermédiaire 2.4.1 n’est nécessaire. Les modifications d’interface préparées auparavant ont été intégrées à cette livraison unique.

Une mise à jour partielle peut mélanger la nouvelle interface et un ancien serveur encore en mémoire, ce qui empêche le chargement des nouveaux modules. Ce correctif harmonise les références de cache et isole le chargement des bilans. Il ne remplace pas l’installation de tous les dossiers nécessaires et le redémarrage de Node.

Les réglages Windows, le point d’entrée `server.js`, les scripts de démarrage automatique et Tailscale ne sont pas modifiés. Aucun déploiement automatique n’est effectué. Seul le code de l’application est remplacé suivant la procédure ci-dessous ; les données persistantes et `config.json` restent en place.

## Avant l’installation

Utiliser le même compte Windows qui a configuré Infinity Therapy. Prévoir une interruption de saisie et fermer les onglets sur les iPhones. Ne pas exécuter `configure-windows.ps1`, de création/réinitialisation de compte, de restauration, ou « Supprimer tous les résidents ». Ne pas modifier Tailscale Serve, l’adresse HTTPS, le port ou les règles d’accès.

Le logiciel reste soumis aux limites documentées dans [SECURITE.md](SECURITE.md) : cette évolution ne certifie pas son usage pour des données de santé réelles. La base et les exports ne sont pas chiffrés par l’application. Utiliser un disque et des sauvegardes chiffrés, un compte Windows protégé et l’accès HTTPS privé Tailscale. Aucun texte médical, observation, motif ou modèle n’est inclus dans les exports. Même les codes résidents et dates restent confidentiels.

Télécharger l’archive `infinity-therapy-2.5.1.zip` fournie avec cette livraison sur le PC. L’extraire dans un dossier temporaire, par exemple `C:\InfinityTherapy-release-2.5.1`. Ce dossier doit contenir directement `package.json`, `server.js`, `src`, `backend`, `scripts`, `tests` et `docs`.

## Sauvegarde et remplacement du code

Ouvrir PowerShell avec le compte Windows habituel. Adapter uniquement `$release` et `$backupRoot`. `$backupRoot` doit désigner un emplacement privé chiffré accessible, hors du dossier de l’application et de celui des données. Exécuter par étapes et s’arrêter au premier message d’erreur.

```powershell
$ErrorActionPreference = 'Stop'
$release = 'C:\InfinityTherapy-release-2.5.1'
$backupRoot = 'E:\SauvegardesInfinity'
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$project = $config.project
$env:INFINITY_DATA_DIR = $config.dataDir
if (!(Test-Path (Join-Path $config.dataDir 'demo.sqlite'))) { throw 'Base existante introuvable : ne pas démarrer.' }
if ((Get-Content (Join-Path $release 'package.json') -Raw | ConvertFrom-Json).version -ne '2.5.1') { throw 'Archive incorrecte.' }
& $config.node --version
# Node doit être >= 24.13.0.
Stop-ScheduledTask -TaskName 'InfinityTherapyDemo'
Get-ScheduledTask -TaskName 'InfinityTherapyDemo' | Select-Object TaskName,State
```

Vérifier que la tâche est arrêtée et fermer tout serveur Infinity Therapy lancé manuellement. Ne pas arrêter les autres logiciels Node. Aucun processus Infinity Therapy ne doit écrire pendant la copie des données. Puis :

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupRoot "avant-2.5.1-$stamp"
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

## Installer le code complet en conservant la configuration

Une fois la sauvegarde vérifiée, garder le serveur arrêté. Les données doivent être hors des dossiers de code ci-dessous. Si ce n’est pas le cas, faire adapter les chemins avant de poursuivre.

```powershell
foreach ($dir in @('backend','src','assets','tests','docs')) {
  $target = Join-Path $project $dir
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Copy-Item -Path (Join-Path $release "$dir\*") -Destination $target -Recurse -Force
}
foreach ($file in @('index.html','package.json','README.md')) {
  Copy-Item -LiteralPath (Join-Path $release $file) -Destination (Join-Path $project $file) -Force
}
Set-Location $project
& $config.node --test tests/domain.test.js tests/api.test.js tests/retention.test.js tests/bulk.test.js tests/assessments.test.js
if ($LASTEXITCODE -ne 0) { throw 'Tests echoues : garder le serveur arrete et appliquer le retour arriere.' }
Start-ScheduledTask -TaskName 'InfinityTherapyDemo'
```

**Copier impérativement le dossier `assets/fonts`**, avec ses deux polices et leur licence : ils permettent la génération PDF locale sans téléchargement. Aucun `npm install`, outil Python, navigateur automatisé ou générateur PDF externe n’est nécessaire en production. Les tests serveur nécessitent les ports de test 31002, 31003 et 31006 libres. Des contrôles PDF supplémentaires utilisent `pdfinfo` et `pdftotext` lorsqu’ils sont disponibles ; ils ont été exécutés dans le cloud Linux.

Ne pas exécuter `configure-windows.ps1`, `install-startup.ps1`, un script de réinitialisation de compte ou une restauration de base pour cette mise à jour. Ne pas toucher à la tâche planifiée, à son compte, son chemin ou son déclencheur. Le `server.js` et le dossier `scripts` de l’installation 2.4.0 restent inchangés.

Au démarrage, une nouvelle table `assessments` est créée dans **la même base SQLite persistante** (`demo.sqlite`). Aucune suppression ni réinitialisation des résidents, modèles, comptes, transmissions ou corbeille n’est effectuée par cette évolution. Les règles existantes des transmissions, dont le traitement du contenu après confirmation Titan, restent inchangées. Les sauvegardes SQLite complètes existantes incluent automatiquement la table des bilans et leurs brouillons. Aucun fichier médical n’est créé dans le dépôt.

## Vérifier après redémarrage

Ouvrir la même adresse HTTPS Tailscale. Sur PC, Ctrl+Maj+R ; sur iPhone, fermer puis rouvrir la page. Vérifier **Version 2.5.1**. Les références de cache ont été actualisées.

1. Vérifier les comptes, résidents, modèles, transmissions et synchronisation PC/iPhone.
2. Transmissions à saisir : badges jaune aujourd’hui, orange hier, rouge pour les dates antérieures, À venir pour les futures ; tri du plus ancien au plus récent. Pas de sélection multiple, export ou corbeille.
3. Historique : dates françaises neutres, tri inverse, sélection multiple et export Excel local. Suppression groupée et accès corbeille réservés à l’administratrice, avec droits serveur inchangés.
4. Regroupement : AMÉLIE sur rose #FCE7F1 et ALEXANDRE sur bleu #E2F1FF, noms, nombres filtrés et tri interne. Dans les attentes, seuls les en-têtes de groupes prennent le pastel ; dans l’historique, les lignes aussi. Désactiver le regroupement retire ces fonds.
5. Ouvrir **Bilans résidents**. Vérifier l’accès avec les rôles autorisés. Ne jamais créer de données médicales réelles pour un simple essai. Suivre le [guide du module](BILANS-RESIDENTS.md) pour le parcours et les limites.
6. Ouvrir un PDF fictif, vérifier les accents, symboles, A4 portrait, pagination et lisibilité sur PC/iPhone. Intégrer le PDF dans Titan manuellement uniquement après vérification.

## Retour arrière conservant les données

Arrêter la tâche et tout serveur manuel. Faire d’abord une copie complète supplémentaire du dossier de données actuel, car il peut contenir de nouveaux bilans ou de nouvelles transmissions.

Restaurer depuis `$backup\code` uniquement les anciens fichiers de code remplacés (`backend`, `src`, `index.html`, `package.json`, `README.md`). Les fichiers supplémentaires peuvent rester : la version 2.4.0 les ignore. Ne pas supprimer la nouvelle table ni remplacer `demo.sqlite`. Relancer la même tâche planifiée et recharger les navigateurs.

La version 2.4.0 ne présente pas les bilans à l’écran, mais ils restent dans la base. Réinstaller 2.5.1 permet de les retrouver. Les statuts Titan et transmissions restent indépendants des bilans.

**Ne pas restaurer automatiquement la sauvegarde d’avant installation** : cela annulerait les écritures postérieures. Une restauration de base nécessite une décision explicite du cabinet, une sauvegarde de l’état courant et un traitement des données nouvelles. Aucune réinitialisation ne doit être utilisée pour résoudre une erreur de mise à jour.

## Validation du correctif

Les 22 tests métier/serveur passent, ainsi que les parcours navigateur existants et le parcours complet des bilans. `tests/startup-browser.mjs` vérifie le démarrage normal, l’évitement des anciens modules en cache, un module Bilans absent (réponse 404), un module principal incompatible, un fichier JavaScript bloqué et JavaScript désactivé. Le stockage du navigateur et l’état de la base sont conservés dans ces scénarios. Aucun accès direct au PC du cabinet n’a été effectué et la remise en service de cette machine reste à vérifier après installation.

## Documents de livraison

- [Guide des bilans et limites connues](BILANS-RESIDENTS.md)
- [Rapport fonctionnel de la version 2.5.0](VALIDATION-2.5.0.md)
- [Sécurité existante de l’application](SECURITE.md)
