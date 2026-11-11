# Installer la version 2.4.0 sur le PC Windows 11

Cette mise à jour conserve le fonctionnement et l’apparence existants et ajoute sélection multiple, export Excel local sans texte médical, corbeille des suppressions groupées, tri, couleurs et regroupement par kiné. Elle ne réinitialise pas la base. Aucun accès au serveur du cabinet ni déploiement Windows n’a été effectué depuis l’environnement cloud.

## Avant l’installation

Utiliser le même compte Windows qui a configuré Infinity Therapy. Prévoir une interruption de saisie et fermer les onglets sur les iPhones. Ne pas exécuter `configure-windows.ps1`, de création/réinitialisation de compte, de restauration, ou « Supprimer tous les résidents ». Ne pas modifier Tailscale Serve, l’adresse HTTPS, le port ou les règles d’accès.

Le logiciel reste soumis aux limites documentées dans [SECURITE.md](SECURITE.md) : cette évolution ne certifie pas son usage pour des données de santé réelles. La base et les exports ne sont pas chiffrés par l’application. Utiliser un disque et des sauvegardes chiffrés, un compte Windows protégé et l’accès HTTPS privé Tailscale. Aucun texte médical, observation, motif ou modèle n’est inclus dans les exports. Même les codes résidents et dates restent confidentiels.

Télécharger l’archive `infinity-therapy-2.4.0.zip` fournie avec cette livraison sur le PC. L’extraire dans un dossier temporaire, par exemple `C:\InfinityTherapy-release-2.4.0`. Ce dossier doit contenir directement `package.json`, `server.js`, `src`, `backend`, `scripts`, `tests` et `docs`.

## Sauvegarde et remplacement du code

Ouvrir PowerShell avec le compte Windows habituel. Adapter uniquement `$release` et `$backupRoot`. `$backupRoot` doit désigner un emplacement privé chiffré accessible, hors du dossier de l’application et de celui des données. Exécuter par étapes et s’arrêter au premier message d’erreur.

```powershell
$ErrorActionPreference = 'Stop'
$release = 'C:\InfinityTherapy-release-2.4.0'
$backupRoot = 'E:\SauvegardesInfinity'
$configPath = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo\config.json'
$config = Get-Content $configPath -Raw | ConvertFrom-Json
$project = $config.project
$env:INFINITY_DATA_DIR = $config.dataDir
if (!(Test-Path (Join-Path $config.dataDir 'demo.sqlite'))) { throw 'Base existante introuvable : ne pas démarrer.' }
if ((Get-Content (Join-Path $release 'package.json') -Raw | ConvertFrom-Json).version -ne '2.4.0') { throw 'Archive incorrecte.' }
& $config.node --version
# Node doit être >= 24.13.0.
Stop-ScheduledTask -TaskName 'InfinityTherapyDemo'
Get-ScheduledTask -TaskName 'InfinityTherapyDemo' | Select-Object TaskName,State
```

Vérifier que la tâche est arrêtée et fermer tout serveur Infinity Therapy lancé manuellement. Ne pas arrêter les autres logiciels Node. Aucun processus Infinity Therapy ne doit écrire pendant la copie des données. Puis :

```powershell
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupRoot "avant-2.4.0-$stamp"
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

Les données doivent être hors des répertoires de code remplacés, comme prévu par l’installation actuelle. Si vous avez déplacé la base sous `src`, `backend`, `scripts`, `tests` ou `docs`, arrêter ici et faire adapter la procédure.

```powershell
foreach ($dir in @('backend','src','scripts','tests','docs')) {
  Copy-Item -Path (Join-Path $release "$dir\*") -Destination (Join-Path $project $dir) -Recurse -Force
}
foreach ($file in @('package.json','server.js','index.html','README.md')) {
  Copy-Item -LiteralPath (Join-Path $release $file) -Destination (Join-Path $project $file) -Force
}
Set-Location $project
# Aucun npm install nécessaire ; aucun package de production.
& $config.node --test tests/domain.test.js tests/api.test.js tests/retention.test.js tests/bulk.test.js
if ($LASTEXITCODE -ne 0) { throw 'Tests échoués : garder le serveur arrêté et appliquer le retour arrière.' }
Start-ScheduledTask -TaskName 'InfinityTherapyDemo'
```

Les tests utilisent uniquement des bases temporaires fictives. Ils nécessitent les ports locaux 31002 et 31003 libres ; le test de structure du fichier Excel s’exécute lorsqu’un Python est disponible (voir rapport de tests). Le serveur garde le chemin de données, les identifiants et la configuration Tailscale existants. La seule nouvelle table, `trash`, est créée automatiquement au démarrage sans réinitialisation. Le nettoyage existant des anciennes transmissions déjà confirmées dans Titan reste inchangé.

## Vérifications après redémarrage

Ouvrir l’adresse HTTPS Tailscale habituelle et forcer l’actualisation du navigateur (Ctrl+Maj+R sur Windows ; fermer/rouvrir la page sur iPhone). Vérifier **Version 2.4.0**, les comptes, résidents, modèles et transmissions. Ne pas créer de données de santé réelles pour tester.

Dans Transmissions à saisir : vérifier le tri des séances de la plus ancienne à la plus récente, les dates exactes et libellés Aujourd’hui (jaune), Hier (orange), Antérieure (rouge). Les dates futures portent À venir. Dans l’historique, le tri est inverse. Le filtre Kiné et « Regrouper par kiné » séparent Amélie et Alexandre ; le tri reste chronologique à l’intérieur de chaque groupe.

« Tout sélectionner » vise uniquement les résultats filtrés. Un changement de filtre vide la sélection. L’export `.xlsx` contient deux feuilles, **Transmissions** et **Traçabilité**, sans contenu médical et sans appel à un service externe. Les cellules sont des chaînes, jamais des formules. La personne ayant validé est le compte connecté lors de la création, distinct du kiné de séance. Pour une ancienne ligne dont l’identité n’a pas été conservée, « Non renseigné (ancienne version) » apparaît. Les dates de validation de l’export sont en ISO avec fuseau UTC (`Z`). Ne pas ouvrir ou stocker ces fichiers dans un service cloud personnel.

L’administratrice peut mettre la sélection en corbeille après confirmation et la restaurer dans **Corbeille récupérable**. Annuler la confirmation ne change rien. Une modification concurrente refuse l’opération entière : recharger et refaire la sélection. Maximum 1000 lignes par opération. Les actions et références techniques sont enregistrées dans le journal d’audit, sans texte médical. Le secrétariat et les kinés peuvent exporter ce qu’ils sont déjà autorisés à consulter, mais ne peuvent ni supprimer en groupe ni consulter/restaurer la corbeille.

La corbeille contient les données originales sur le même PC, reste dans les sauvegardes et n’a aucune purge automatique ni commande de suppression définitive nouvelle. Une ligne dont le résident a été supprimé ne peut plus être restaurée. Les anciennes fonctions individuelles d’effacement et la suppression de résident restent disponibles avec leurs droits et confirmations existants ; elles ne passent pas par cette nouvelle corbeille. La restauration d’un suivi Titan ne recrée pas son texte déjà effacé.

Les compteurs globaux utilisent désormais :

- **Transmissions présentes (hors annulées)** : soins ET séances non réalisées, comprenant les suivis déjà saisis.
- **En attente de saisie Titan** : mêmes types de séances, statuts À saisir et En cours de saisie seulement.
- **Saisies sur Titan** : lignes déjà confirmées.

Ainsi, présentes = en attente + saisies. Les annulées et la corbeille sont exclues des trois compteurs. L’ancien compteur excluait les séances non réalisées, ce qui pouvait expliquer 15/16 ; les données du cabinet n’ayant pas été consultées, l’écart particulier reste à vérifier sur place.

## Retour arrière sans perte silencieuse

Arrêter la tâche et tous les serveurs Infinity Therapy manuels. Faire une nouvelle copie complète des données actuelles avant tout retour arrière. Restaurer uniquement les dossiers de code et les fichiers remplacés depuis `$backup\code`, puis redémarrer avec la configuration existante. Ne pas supprimer la table `trash` ni remplacer la base : l’ancien code ignore cette table, et les lignes en corbeille restent récupérables en réinstallant 2.4.0. Restaurer ces lignes avant retour arrière si elles doivent apparaître dans l’ancienne interface.

Une restauration de base à partir de `$backup\donnees` annulerait toutes les saisies ultérieures : ne l’entreprendre qu’en cas de nécessité, après sauvegarde de la base actuelle et décision explicite du cabinet. Ne jamais réinitialiser la base pour résoudre un problème de mise à jour.
