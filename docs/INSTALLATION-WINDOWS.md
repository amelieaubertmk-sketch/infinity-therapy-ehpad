# Installer Infinity Therapy sur le PC du cabinet et les iPhones

> **Version 2.2 — suivi Titan :** après confirmation de saisie, le texte et les observations sont effacés de la base active, mais une ligne date/résident/secteur/activité/statut reste consultable dans l’historique. Les anciens contenus déjà marqués saisis sont nettoyés au redémarrage après mise à jour. La suppression définitive d’un résident efface aussi ses lignes de suivi. Les sauvegardes antérieures ne sont pas modifiées. Voir [la règle complète](../README.md#suppression-définitive-et-suivi-après-titan--version-22).


Ce guide concerne **l’application privée partagée**, installée sur l’ordinateur du cabinet. L’ancien lien GitHub Pages reste une démonstration séparée : il ne partage pas ses données avec le PC.

**Ordinateur indiqué : Windows 11, version 26H2, build 26300.9818.** Cette information est celle que vous nous avez communiquée. L’installation n’a pas été testée sur ce PC ou cette build précise ; les vérifications ci-dessous permettront de la confirmer sur place.

**Utilisez uniquement des résidents et transmissions fictifs.** Cette installation n’autorise pas l’utilisation de données médicales réelles.

## Avant de commencer

Prévoyez : le PC du cabinet, une connexion Internet, vos droits d’installation Windows et les deux iPhones. Effectuez les étapes dans l’ordre, sur le PC, sauf lorsque le guide indique « sur iPhone ».

Le fonctionnement sera le suivant :

- Le PC conserve la base de données et doit rester **allumé, connecté et sans mise en veille**.
- Tailscale relie les appareils dans un réseau privé ; il ne faut ouvrir aucun port sur la box.
- Chaque personne se connecte ensuite à Infinity Therapy avec son propre compte.

Il y aura **trois sortes de comptes ou mots de passe** :

| Compte | À quoi sert-il ? |
| --- | --- |
| Windows | Ouvrir la session du PC et autoriser son démarrage automatique |
| Tailscale | Autoriser les appareils à rejoindre le réseau privé |
| Infinity Therapy | Donner à chaque personne ses droits dans l’application |

N’envoyez aucun mot de passe dans le chat, dans une capture d’écran ou sur GitHub. Aucun compte Infinity Therapy n’a de mot de passe prédéfini.

## 1. Préparer le PC et télécharger l’application

### A. Installer Node.js

Node.js est le programme qui fait fonctionner l’application sur le PC.

1. Sur le PC du cabinet, ouvrez [nodejs.org](https://nodejs.org/).
2. Choisissez **Node.js 24 LTS**, version **24.13 ou supérieure dans la série 24**, et le programme d’installation Windows `.msi` adapté au PC. Si plusieurs architectures sont proposées : Windows → Paramètres → Système → Informations système → Type du système permet de vérifier x64 ou ARM64.
3. Lancez le fichier téléchargé et conservez les options proposées. Les outils supplémentaires de compilation ne sont pas nécessaires à cette application.
4. Fermez les anciens terminaux ouverts, puis ouvrez **Démarrer → PowerShell**.
5. Copiez cette commande, puis appuyez sur **Entrée** :

```powershell
node --version
```

**Résultat attendu :** un numéro commençant par `v24.`, au moins `v24.13.0`. Si Windows indique que `node` n’est pas reconnu, fermez puis rouvrez PowerShell ; si nécessaire, réinstallez Node.js en conservant son ajout au PATH.

### B. Télécharger le projet

1. Ouvrez [le dépôt Infinity Therapy](https://github.com/amelieaubertmk-sketch/infinity-therapy-ehpad).
2. Cliquez sur le bouton **Code**, puis **Download ZIP**.
3. Dans les téléchargements Windows, faites un clic droit sur le ZIP → **Extraire tout**.
4. Placez le dossier extrait dans un emplacement permanent, par exemple `C:\InfinityTherapyDemo`. Évitez de le laisser dans les téléchargements. Si Windows demande une autorisation pour créer ce dossier, utilisez un dossier permanent auquel votre compte a accès.
5. Ouvrez ce dossier : vous devez voir directement **package.json**, **server.js**, **scripts** et **docs**. Si vous ne voyez qu’un second dossier, entrez dans celui-ci : c’est le véritable dossier du projet.

Le code peut être public sur GitHub. **La base de données et les mots de passe restent sur le PC**, en dehors de ce dossier de code. Aucun transfert des données de l’ancienne démonstration n’est effectué.

### C. Ouvrir PowerShell dans le bon dossier

Dans l’Explorateur Windows, ouvrez le dossier qui contient `server.js`. Cliquez dans sa barre d’adresse, tapez `powershell`, puis appuyez sur Entrée. Une fenêtre PowerShell s’ouvre directement au bon endroit.

Vérifiez :

```powershell
Test-Path .\scripts\configure-windows.ps1
```

**Résultat attendu : `True`.** Si vous obtenez `False`, retournez dans le dossier qui contient réellement `scripts` et `server.js`.

Pour les blocs de commandes de ce guide, copiez uniquement le texte à l’intérieur du bloc, sans ajouter les mots « powershell » ou les délimiteurs du bloc. Exécutez les lignes dans l’ordre.

### D. Installer Tailscale

1. Téléchargez et installez Tailscale depuis [la page officielle Windows](https://tailscale.com/download/windows).
2. Connectez le PC à votre compte Tailscale. Le compte qui gère ce réseau pourra ensuite inviter les autres personnes.
3. Dans le menu de l’icône Tailscale, près de l’horloge Windows, recherchez **Run unattended** (« fonctionnement sans session ouverte ») et activez-le. Le libellé ou l’emplacement peut varier selon la version.
4. Dans Windows → Paramètres → Système → Alimentation, empêchez la **mise en veille sur secteur** pendant les périodes d’utilisation. L’écran peut s’éteindre ; le PC doit continuer à fonctionner. Conservez les mises à jour de sécurité Windows.

Tailscale propose une offre personnelle gratuite pour les usages éligibles. Vérifiez ses conditions actuelles : un usage professionnel peut nécessiter une autre offre. Aucun abonnement d’hébergement de base de données n’est nécessaire ; ne souscrivez pas automatiquement une offre payante pour tester cette démonstration fictive.

## 2. Obtenir le lien privé de l’application

Dans PowerShell, exécutez :

```powershell
tailscale serve --bg http://127.0.0.1:3000
tailscale serve status
```

Si la commande `tailscale` n’est pas reconnue, fermez puis rouvrez PowerShell après l’installation. Si nécessaire, le programme est généralement accessible avec cette commande :

```powershell
& "$env:ProgramFiles\Tailscale\tailscale.exe" serve --bg http://127.0.0.1:3000
& "$env:ProgramFiles\Tailscale\tailscale.exe" serve status
```

Tailscale peut afficher un lien pour autoriser HTTPS. Ouvrez **le lien qu’il fournit**, connectez-vous à votre compte Tailscale et suivez ses instructions, puis relancez la commande si demandé.

**Résultat attendu :** une adresse ressemblant à `https://nom-du-pc.nom-du-reseau.ts.net`. Copiez votre adresse dans une note : c’est **le futur lien privé Infinity Therapy**, commun au PC et aux iPhones. L’adresse donnée ici est un exemple, elle ne doit pas être copiée telle quelle.

À ce stade, l’application n’est pas encore démarrée : il est normal que cette adresse ne l’affiche pas. Continuez le guide jusqu’à l’étape 5.

Utilisez un nom de PC neutre : le nom du certificat HTTPS peut apparaître dans des journaux de certificats publics. N’y mettez aucune information personnelle ou médicale.

**Utilisez Tailscale Serve, jamais Funnel.** Serve fournit l’accès privé au réseau Tailscale. N’ouvrez aucun port public sur la box, ne configurez aucun tunnel public et n’ignorez pas les alertes de certificat du navigateur.

## 3. Limiter les personnes autorisées dans Tailscale

Cette étape limite les personnes et appareils pouvant atteindre le PC. Elle est plus technique : si le réseau Tailscale sert déjà à d’autres usages, faites-vous accompagner pour préserver ses règles existantes.

Dans [la console d’administration Tailscale](https://login.tailscale.com/admin) :

1. Invitez uniquement les personnes autorisées avec leurs propres comptes et activez une authentification multifacteur lorsque disponible.
2. Autorisez et vérifiez chaque appareil ; utilisez l’approbation des appareils si proposée.
3. Dans **Access controls**, remplacez une éventuelle règle générale autorisant tout le réseau par des règles minimales adaptées. Ne collez pas l’exemple ci-dessous en plus d’une règle `* → *` : celle-ci annulerait la restriction attendue.
4. Adaptez les adresses des utilisateurs et l’adresse Tailscale stable du PC. L’interface Tailscale doit valider la politique avant l’enregistrement.

Exemple de politique minimale pour ce réseau de démonstration uniquement :

```json
{
  "groups": {
    "group:infinity-demo": [
      "compte-admin@example.invalid",
      "compte-kine@example.invalid",
      "compte-secretariat@example.invalid"
    ]
  },
  "hosts": {
    "infinity-pc": "100.101.102.103"
  },
  "grants": [
    {
      "src": ["group:infinity-demo"],
      "dst": ["infinity-pc"],
      "ip": ["tcp:443"]
    }
  ]
}
```

Les adresses et l’IP sont des exemples à remplacer. Préservez les règles indispensables d’un réseau préexistant ; faites-vous accompagner avant de les modifier si d’autres services l’utilisent. N’accordez pas le port 3000 aux iPhones : seul le HTTPS 443 de Serve est utilisé. Désactivez tout partage de machine non souhaité. Déconnectez un appareil perdu et désactivez aussi son compte dans l’application. Le VPN ne remplace pas les mots de passe individuels de l’application.

## 4. Configurer l’application et son premier compte

Reprenez la fenêtre PowerShell ouverte dans le dossier du projet à l’étape 1C. Utilisez toujours le **même compte Windows** pour la configuration et le démarrage.

Les scripts proviennent du dépôt que vous venez de télécharger. Après avoir vérifié cette provenance, débloquez-les pour Windows :

```powershell
Get-ChildItem .\scripts\*.ps1 | Unblock-File
```

Puis lancez la configuration :

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\configure-windows.ps1
```

Si Windows bloque le script téléchargé, débloquez les scripts après en avoir vérifié la provenance :

```powershell
Get-ChildItem .\scripts\*.ps1 | Unblock-File
Set-ExecutionPolicy -Scope Process RemoteSigned
.\scripts\configure-windows.ps1
```

Ne désactivez pas globalement les protections Windows. Le réglage `Process` ne concerne que le terminal courant. Les commandes de lancement et la tâche planifiée appliquent également `RemoteSigned` uniquement à leur processus PowerShell ; les scripts téléchargés doivent être débloqués après vérification. Une stratégie de sécurité de votre organisation peut exiger l’intervention de son administrateur.

1. Quand la question apparaît, collez **votre adresse HTTPS Tailscale obtenue à l’étape 2**, sans chemin ni `:3000`, puis appuyez sur Entrée.
2. Choisissez un identifiant administrateur (minuscules, chiffres, points ou tirets).
3. Entrez le nom affiché. À la question du rôle, tapez exactement **admin**, puis Entrée.
4. Choisissez et confirmez un mot de passe unique d’au moins 12 caractères. **Rien ne s’affiche pendant la saisie : c’est normal.** Appuyez sur Entrée après chaque saisie. Conservez-le dans votre gestionnaire de mots de passe.

**Résultat attendu :** les messages « Compte enregistré » puis « Configuration enregistrée ». Ne relancez pas la configuration complète si elle a réussi.

La configuration sans secret et la base fictive sont dans `%LOCALAPPDATA%\InfinityTherapyDemo`. Le script limite les droits Windows du dossier à votre compte et à SYSTEM. La base et les journaux ne doivent jamais être ajoutés au dépôt ni synchronisés vers un service externe.

Si la création du compte a échoué après l’enregistrement de la configuration, n’effacez pas la base. Dans le terminal du projet :

```powershell
$env:INFINITY_DATA_DIR = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo'
node .\scripts\admin.js create
```

## 5. Ouvrir l’application sur le PC

Dans PowerShell, toujours dans le dossier du projet :

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\start-windows.ps1
```

**Résultat attendu :** un événement `server.started`. La fenêtre reste occupée : c’est normal, le serveur fonctionne. **Gardez cette fenêtre ouverte** pendant l’essai. Sur le PC, ouvrez l’adresse **HTTPS Tailscale**, pas `localhost` : l’application vérifie l’adresse autorisée et utilise un cookie sécurisé. Connectez-vous au compte administrateur.

Vous devez maintenant voir l’application habituelle, avec un écran de connexion au préalable. Dans **Boss → Utilisateurs → Ajouter un compte**, créez les deux autres comptes :

- Le compte individuel du kinésithérapeute, rôle `kine`.
- Le compte individuel du secrétariat, rôle `secretariat`.

Choisissez des mots de passe distincts et communiquez-les séparément, sans les publier dans GitHub ou dans un groupe de discussion. Les comptes peuvent être modifiés, désactivés et leurs mots de passe réinitialisés depuis ce même écran. Toute modification ferme leurs sessions. Le compte administrateur ne peut pas retirer ses propres droits.

Pour arrêter proprement un serveur manuel, cliquez dans son terminal puis faites **Ctrl+C**.

## 6. Démarrage automatique avec Windows

Le script crée une tâche du Planificateur Windows sous votre compte, avec privilèges limités, déclenchée au démarrage même sans session ouverte. Il demande le **mot de passe Windows**, pas le PIN ; Windows gère ce secret, le projet ne l’enregistre pas. Un compte Windows avec mot de passe est nécessaire.

1. Arrêtez le serveur manuel en cliquant dans sa fenêtre puis en appuyant sur **Ctrl+C**. Ne démarrez pas deux serveurs simultanément.
2. Ouvrez **Démarrer → PowerShell → Exécuter en tant qu’administrateur**, avec le **même compte Windows**. Si Windows exige les identifiants d’un autre compte, faites-vous accompagner : ne changez pas de compte au hasard.
3. Revenez au dossier du projet. Si vous avez utilisé l’emplacement proposé :

```powershell
Set-Location C:\InfinityTherapyDemo
```

Adaptez ce chemin si votre dossier est ailleurs. Puis exécutez :

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\install-startup.ps1
Start-ScheduledTask -TaskName InfinityTherapyDemo
```

Si Windows refuse l’enregistrement d’une tâche au démarrage, ouvrez PowerShell **en tant qu’administrateur avec le même compte** et relancez. Ne configurez pas le serveur avec le compte SYSTEM, ni avec un autre compte : la configuration et les droits de données sont liés au compte choisi.

4. Ouvrez le **Planificateur de tâches → Bibliothèque → InfinityTherapyDemo**. Vérifiez le déclencheur Au démarrage et « Exécuter même si l’utilisateur n’est pas connecté ».
5. Redémarrez le PC et vérifiez l’adresse HTTPS avant d’ouvrir la session Windows. Ce test doit être fait sur votre PC ; il n’a pas été exécuté dans l’environnement Linux de développement.
6. Si vous changez le mot de passe Windows ou déplacez le projet, mettez à jour la configuration et réenregistrez la tâche.

Le serveur gère SIGINT/SIGTERM proprement. Windows peut cependant terminer de force une tâche ou un processus à l’extinction : SQLite utilise son journal WAL et des écritures synchrones pour conserver les transactions confirmées et récupérer après un arrêt brutal. Cela ne remplace pas une sauvegarde ni un test réel d’extinction Windows.

## 7. Ouvrir depuis les iPhones en 5G

1. Installez **Tailscale** depuis l’App Store sur chacun des iPhones.
2. Connectez chaque personne avec son compte Tailscale autorisé, approuvez l’appareil puis activez le VPN Tailscale.
3. Désactivez le Wi-Fi pour le test et vérifiez la 5G.
4. Dans Safari, collez **votre adresse HTTPS Tailscale notée à l’étape 2**, identique à celle utilisée sur le PC. N’utilisez ni `localhost`, ni le lien GitHub Pages.
5. Connectez chaque personne avec son propre compte Infinity Therapy.
6. Facultatif : dans Safari → Partager → **Sur l’écran d’accueil**.

**Vérification à faire sur vos appareils :** créez une transmission fictive sur un iPhone. Elle doit apparaître dans le suivi sur l’autre appareil en environ cinq secondes lorsque la liste est visible. Le secrétariat la copie, la colle manuellement dans Titan, puis la marque comme saisie. Cette version ne communique jamais directement avec Titan.

PC éteint, en veille ou déconnecté : l’application est indisponible. Elle ne fonctionne pas hors ligne. Le formulaire ouvert conserve votre saisie à l’écran après une erreur réseau ; ne fermez pas et ne rechargez pas la page si vous souhaitez la garder. Après une réponse perdue, consultez l’historique avant de renvoyer une transmission.

## Vider les données Infinity Therapy sur votre PC

Cette procédure supprime **les données de l’application uniquement**, pas le contenu de votre ordinateur. Elle conserve les comptes d’Amélie, d’Alexandre et du secrétariat, leurs mots de passe et la connexion Tailscale.

### A. Installer d’abord la dernière version du code

Si votre interface n’affiche pas **Version 2.3.2**, mettez-la à jour avant de chercher le bouton de suppression. Si cette version est déjà présente, passez à B.

1. Prévenez Alexandre et le secrétariat de ne pas saisir de nouvelles transmissions pendant l’opération.
2. Arrêtez le serveur : dans la fenêtre PowerShell où il tourne, faites **Ctrl+C**. Si vous avez installé le démarrage automatique, arrêtez plutôt sa tâche depuis PowerShell avec les droits nécessaires :

```powershell
Stop-ScheduledTask -TaskName InfinityTherapyDemo
```

Cette commande concerne uniquement les installations avec tâche planifiée. Ne la lancez pas si vous démarrez simplement le serveur à la main.

3. Ouvrez [le dépôt Infinity Therapy](https://github.com/amelieaubertmk-sketch/infinity-therapy-ehpad), cliquez sur **Code → Download ZIP**, puis **Extraire tout** sur le ZIP téléchargé.
4. Retrouvez le dossier actuel du code : celui qui contient `server.js`, `package.json` et `scripts`. Si vous avez gardé l’emplacement initial, il est dans Documents, sous `infinity-therapy-ehpad-main`. Pour ouvrir le dossier réellement enregistré dans votre configuration, copiez cette commande dans PowerShell :

```powershell
explorer.exe ((Get-Content "$env:LOCALAPPDATA\InfinityTherapyDemo\config.json" -Raw | ConvertFrom-Json).project)
```

5. Dans le nouveau dossier extrait, ouvrez le sous-dossier qui contient directement `server.js`. Sélectionnez **son contenu**, copiez-le dans le dossier actuel du code et choisissez **Remplacer les fichiers dans la destination**. Ne placez pas simplement un second dossier `infinity-therapy-ehpad-main` à l’intérieur du premier. Gardez le chemin actuel du projet.
6. Dans PowerShell ouvert dans ce dossier, débloquez les scripts téléchargés après vérification de leur provenance :

```powershell
Get-ChildItem .\scripts\*.ps1 | Unblock-File
```

7. Redémarrez le serveur **selon votre méthode habituelle**, une seule fois :

Pour un démarrage manuel :

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\start-windows.ps1
```

Laissez cette fenêtre ouverte. Pour une installation avec tâche automatique, utilisez plutôt :

```powershell
Start-ScheduledTask -TaskName InfinityTherapyDemo
```

8. Ouvrez votre adresse privée HTTPS Tailscale. Sur ordinateur, faites **Ctrl+Maj+R** pour recharger la page. Vérifiez **Version 2.3.2** en bas de l’écran. Les comptes et données sont encore là à ce stade : la mise à jour ne vide pas la liste à votre place.

**Ne relancez pas `configure-windows.ps1`. Ne supprimez ni `%LOCALAPPDATA%\InfinityTherapyDemo`, ni `demo.sqlite`, ni `config.json`.** Ces fichiers servent aussi aux comptes et à votre configuration.

### B. Effacer la liste actuelle depuis Boss

1. Connectez-vous avec **amelie**, votre compte administrateur.
2. Ouvrez **Boss → Résidents & modèles**.
3. Cliquez sur **Supprimer tous les résidents**.
4. Lisez le nombre de résidents et de transmissions ou lignes de suivi annoncé.
5. Tapez exactement **SUPPRIMER**, puis cliquez sur **Confirmer la suppression de tous les résidents**.
6. Attendez le message **« Liste vidée. Vos comptes sont conservés. »**. Si un message réseau ou de conflit apparaît, l’effacement n’est pas confirmé : vérifiez les données avant de réessayer.

Cette action efface de la base active tous les résidents, y compris archivés, leurs quatre modèles, les transmissions encore présentes et les lignes de suivi Titan. Elle n’est pas réversible depuis l’interface. Vous pourrez ensuite ajouter de nouveaux résidents via **Ajouter un résident**.

### C. Vérifier que le nettoyage a fonctionné

- Dans Boss, le compteur des résidents actifs doit être à **0**.
- Les listes **Actifs** et **Archives** doivent être vides.
- Le suivi des transmissions doit être vide.
- Votre compte et ceux d’Alexandre et du secrétariat doivent toujours exister dans **Utilisateurs**.
- Rechargez la page : les résidents ne doivent pas réapparaître. Ils ne seront pas recréés automatiquement au redémarrage du serveur.
- Demandez aux autres utilisateurs de fermer les anciennes fenêtres de détail et de recharger leurs pages.

### D. Ce qui reste après une nouvelle saisie Titan

Une fois cette version installée, le fonctionnement est le suivant :

1. La transmission est conservée tant qu’elle est **À saisir** ou **En cours de saisie**.
2. **Copier** n’efface rien et ne change pas le statut.
3. Après la saisie dans Titan, cliquez sur **Marquer comme saisi sur Titan** et confirmez l’avertissement.
4. Après confirmation du serveur, le **texte final, le texte de séance, l’observation, le motif éventuel et les autres champs de contenu de cette transmission sont retirés de la base active**. Il ne s’agit pas seulement de masquer leur affichage.
5. Dans **Voir l’historique**, seule une ligne de suivi reste, par exemple : **05/11/2026 · ARB. · Premier étage · Marche · Saisi sur Titan**. Le praticien et les dates techniques de validation/confirmation restent pour le suivi ; une séance non réalisée garde un indicateur sans son motif.
6. **Voir le suivi** n’affiche aucun contenu et ne propose ni copie, ni réouverture du statut. Le contenu ne peut pas être récupéré depuis cette ligne.

Les modèles réutilisables de la bibliothèque du résident sont distincts des textes de séance : ils restent disponibles pour préparer les prochaines séances. Supprimer le résident efface aussi ses modèles et ses lignes de suivi de la base active.

**Limites de cette confirmation :** les anciennes sauvegardes, les copies collées dans Titan, le presse-papiers, les exports éventuels et les anciennes pages encore ouvertes ne sont pas effacés par cette opération. Des événements techniques d’audit sans le texte des transmissions sont conservés. SQLite efface le contenu actif et tente de tronquer son journal après l’opération, mais cela ne garantit pas l’absence de toute trace physique sur le disque, les snapshots Windows ou les supports de sauvegarde. Si vous aviez créé des sauvegardes auparavant, leur nettoyage est une opération distincte : ne supprimez pas des fichiers au hasard et ne confondez pas une sauvegarde avec la base en service.

## Supprimer une ligne de suivi saisie par erreur

Après mise à jour vers la version **2.3.1**, connectez-vous avec **amelie**, puis :

1. Ouvrez **Kiné → Transmissions à saisir dans Titan**.
2. Cliquez sur **Voir l’historique**.
3. Sur la ligne concernée, cliquez sur **Voir le suivi**.
4. Cliquez sur **Supprimer cette ligne de suivi**, puis confirmez.

La ligne est retirée de la base active ; le résident et les autres entrées sont conservés. Cela ne supprime rien dans Titan. Si une saisie réelle dans Titan était erronée, corrigez-la directement dans Titan. Le texte déjà effacé n’est pas récupérable depuis cette fonction. Ce bouton est réservé au compte administrateur. Les sauvegardes antérieures restent inchangées.

## Après l’installation : ce qu’il faut garder

- Votre lien privé HTTPS Tailscale, à mettre en favori sur les trois appareils.
- Les identifiants individuels et mots de passe, dans un gestionnaire sécurisé.
- Le dossier du code, à son emplacement permanent.
- Le dossier des données et sa configuration : appuyez sur **Windows + R**, tapez `%LOCALAPPDATA%\InfinityTherapyDemo`, puis Entrée pour le retrouver. Ne supprimez pas ce dossier.

## 8. Sauvegarder

Faites des sauvegardes régulières, avant chaque mise à jour et avant une restauration. Choisissez un support privé chiffré, par exemple une clé chiffrée gardée en lieu sûr. Une sauvegarde contient aussi les comptes hachés : elle est confidentielle même dans cette démonstration.

Depuis le terminal du projet, sous le même compte Windows :

```powershell
$env:INFINITY_DATA_DIR = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo'
node .\scripts\backup.js 'E:\SauvegardesInfinity\demo-2026-11-05.sqlite'
```

Adaptez la lettre de lecteur et choisissez un nom nouveau à chaque fois. L’outil refuse d’écraser une sauvegarde existante et utilise l’API SQLite de sauvegarde cohérente, même si le serveur tourne. N’effectuez pas une simple copie du fichier `demo.sqlite` pendant son utilisation : le WAL peut contenir des données récemment confirmées. Conservez séparément le fichier `config.json` et le dossier du projet, sans les publier.

## 9. Restaurer

1. Sauvegardez d’abord l’état actuel si possible.
2. Arrêtez la tâche :

```powershell
Stop-ScheduledTask -TaskName InfinityTherapyDemo
```

3. Fermez tout serveur manuel avec Ctrl+C. Vérifiez qu’aucun processus de ce serveur ne tourne dans le Gestionnaire des tâches. Ne terminez pas d’autres programmes Node non concernés.
4. Depuis le dossier du projet :

```powershell
$env:INFINITY_DATA_DIR = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo'
node .\scripts\restore.js 'E:\SauvegardesInfinity\demo-2026-11-05.sqlite' --server-stopped
Start-ScheduledTask -TaskName InfinityTherapyDemo
```

Le script vérifie l’intégrité de la sauvegarde, garde une copie du fichier actuel, remplace la base puis ferme toutes les anciennes sessions. **Le paramètre `--server-stopped` atteste que vous avez arrêté le serveur ; le script ne peut pas le garantir pour tous les processus Windows.** Toutes les modifications postérieures à la sauvegarde sont perdues dans la base restaurée. Vérifiez les résidents, les comptes et les transmissions fictives après reconnexion.

## 10. Mettre à jour sans perdre les données

1. Faites une sauvegarde cohérente et conservez la version actuelle du projet pour retour arrière.
2. Arrêtez la tâche et tout serveur manuel.
3. Téléchargez la nouvelle version du même dépôt. Remplacez uniquement le dossier du code. Ne supprimez jamais `%LOCALAPPDATA%\InfinityTherapyDemo`.
4. Gardez le même chemin du projet, ou corrigez `project` dans `config.json` et réinstallez la tâche.
5. Si une nouvelle version impose une migration, suivez sa procédure spécifique avant de redémarrer ; ne restaurez pas une ancienne version sur un schéma plus récent sans vérifier sa compatibilité.
6. Redémarrez la tâche, reconnectez-vous, contrôlez les données puis testez une transmission fictive.

## 11. Dépannage

| Symptôme | À vérifier |
| --- | --- |
| Site inaccessible sur tous les appareils | PC allumé/hors veille, Internet, tâche InfinityTherapyDemo active, `tailscale serve status` |
| Accessible au PC mais pas en 5G | VPN actif sur l’iPhone, même réseau Tailscale, appareil approuvé et règles d’accès |
| Hôte non autorisé / origine refusée | Adresse HTTPS exacte dans `config.json`, aucune ouverture par IP ou ancien lien GitHub ; utiliser l’URL sans port 3000 |
| Certificat invalide | HTTPS Tailscale activé, date/heure correctes ; ne pas ignorer l’alerte |
| Connexion refusée | Compte actif, identifiant individuel correct, mot de passe ; après trop d’essais attendre 15 minutes |
| Session expirée | Se reconnecter : durée maximale de huit heures |
| Modification concurrente | Bouton Recharger les données partagées, vérifier le formulaire puis valider à nouveau |
| Stockage/écriture impossible | Espace disque et droits du compte de la tâche sur le dossier de données ; ne pas répéter aveuglément la validation |
| Données différentes d’un appareil à l’autre | Vérifier que tous ouvrent la même URL Tailscale, pas GitHub Pages |
| Redémarrage automatique inopérant | Mot de passe Windows de la tâche, chemin Node/code, droits de lancement, historique du Planificateur et Tailscale Run unattended |

Les journaux techniques sont `technical.log` et `technical.log.previous` dans le dossier de données. Ils contiennent des événements génériques sans mot de passe, corps de requête ni texte de soins. L’audit des actions est dans Boss. Ne partagez pas de base ou de journal sans en vérifier le contenu.

Mot de passe administrateur perdu : arrêtez le serveur et, dans le terminal du projet :

```powershell
$env:INFINITY_DATA_DIR = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo'
node .\scripts\admin.js reset
```

Entrez l’identifiant existant puis un nouveau mot de passe masqué, et redémarrez. Cet accès local doit être réservé aux personnes autorisées à administrer le PC.

## Installation terminée : contrôles à cocher

- [ ] Le PC affiche l’application à son adresse HTTPS privée.
- [ ] Chaque utilisateur dispose de son compte individuel et du bon rôle.
- [ ] Les deux iPhones ouvrent cette même adresse avec Tailscale actif et le Wi-Fi coupé.
- [ ] Une transmission fictive créée sur un appareil apparaît sur l’autre.
- [ ] Le statut Titan modifié par le secrétariat apparaît sur les autres appareils.
- [ ] Le site redevient accessible après redémarrage du PC, même sans ouvrir sa session Windows.
- [ ] Une sauvegarde a été créée et sa restauration testée sur des données fictives.

Ces vérifications doivent être réalisées sur place : connaître la version Windows ne permet pas de les considérer comme réussies. Pour les limites et obligations avant toute utilisation réelle, consultez [le document de sécurité](SECURITE.md).
