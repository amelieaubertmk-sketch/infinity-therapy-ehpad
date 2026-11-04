# Installation privée — Windows 11 et iPhone

Cette procédure sert uniquement à une démonstration fictive. Aucun abonnement d’hébergement de base de données n’est nécessaire. Le PC doit rester allumé, connecté et hors veille pour être accessible à distance. La mise en place sur votre PC ne peut pas être effectuée depuis cette session cloud.

## 1. Préparer le PC

1. Installez **Node.js 24 LTS**, version 24.13 ou supérieure, depuis https://nodejs.org. Conservez les options proposées.
2. Téléchargez le dépôt existant : GitHub → **Code → Download ZIP**. Extrayez-le dans un dossier permanent, par exemple `C:\InfinityTherapyDemo`. Évitez OneDrive et les dossiers synchronisés pour les données.
3. Installez Tailscale depuis https://tailscale.com/download/windows et connectez le PC à votre réseau Tailscale privé.
4. Dans Tailscale, activez **Run unattended** pour qu’il reste connecté après redémarrage sans ouverture de session Windows.
5. Dans les paramètres d’alimentation Windows, empêchez la mise en veille du PC sur secteur. Ne désactivez pas ses mises à jour de sécurité.

Tailscale propose une offre personnelle gratuite pour les usages éligibles. Vérifiez les conditions actuelles : un usage professionnel peut nécessiter une autre offre. Cette démonstration fictive n’impose aucun abonnement d’hébergement ; ne souscrivez pas automatiquement une offre payante pour la tester. Une alternative VPN reste possible mais nécessite une configuration distincte.

## 2. Créer l’adresse privée HTTPS

Dans PowerShell sur le PC :

```powershell
tailscale serve --bg http://127.0.0.1:3000
tailscale serve status
```

Tailscale peut vous demander d’autoriser HTTPS pour le réseau : ouvrez le lien qu’il affiche et suivez ses instructions. Notez l’adresse **https://nom-du-pc.nom-du-reseau.ts.net** donnée par Serve. Ce nom peut être publié dans les journaux de certificats publics ; choisissez un nom de machine neutre, sans information personnelle ou médicale.

**Utilisez Serve, jamais Funnel.** Serve est privé au réseau Tailscale. Ne créez aucune redirection de port sur la box, aucune règle Internet publique et aucun tunnel public. Ne désactivez pas la validation TLS du navigateur.

## 3. Limiter les personnes autorisées dans Tailscale

Dans la console d’administration Tailscale :

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

Dans l’Explorateur Windows, ouvrez le dossier du projet, faites un clic droit → **Ouvrir dans le Terminal**. Exécutez :

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

1. Entrez l’adresse HTTPS exacte de l’étape précédente, sans chemin final.
2. Choisissez un identifiant administrateur (minuscules, chiffres, points ou tirets).
3. Entrez le nom affiché puis le rôle **admin**.
4. Choisissez et confirmez un mot de passe unique d’au moins 12 caractères. Il ne s’affiche pas pendant la saisie.

La configuration sans secret et la base fictive sont dans `%LOCALAPPDATA%\InfinityTherapyDemo`. Le script limite les droits Windows du dossier à votre compte et à SYSTEM. La base et les journaux ne doivent jamais être ajoutés au dépôt ni synchronisés vers un service externe.

Si la création du compte a échoué après l’enregistrement de la configuration, n’effacez pas la base. Dans le terminal du projet :

```powershell
$env:INFINITY_DATA_DIR = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo'
node .\scripts\admin.js create
```

## 5. Démarrer et créer les deux autres comptes

```powershell
powershell -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\start-windows.ps1
```

Gardez ce terminal ouvert pendant l’essai. Sur le PC, ouvrez l’adresse **HTTPS Tailscale**, pas `localhost` : l’application vérifie l’adresse autorisée et utilise un cookie sécurisé. Connectez-vous au compte administrateur.

Dans **Boss → Utilisateurs → Ajouter un compte**, créez :

- Le compte individuel du kinésithérapeute, rôle `kine`.
- Le compte individuel du secrétariat, rôle `secretariat`.

Choisissez des mots de passe distincts et communiquez-les séparément, sans les publier dans GitHub ou dans un groupe de discussion. Les comptes peuvent être modifiés, désactivés et leurs mots de passe réinitialisés depuis ce même écran. Toute modification ferme leurs sessions. Le compte administrateur ne peut pas retirer ses propres droits.

Pour arrêter proprement un serveur manuel, cliquez dans son terminal puis faites **Ctrl+C**.

## 6. Démarrage automatique avec Windows

Le script crée une tâche du Planificateur Windows sous votre compte, avec privilèges limités, déclenchée au démarrage même sans session ouverte. Il demande le **mot de passe Windows**, pas le PIN ; Windows gère ce secret, le projet ne l’enregistre pas. Un compte Windows avec mot de passe est nécessaire.

1. Arrêtez le serveur manuel avec Ctrl+C.
2. Depuis PowerShell dans le projet, exécutez :

```powershell
.\scripts\install-startup.ps1
Start-ScheduledTask -TaskName InfinityTherapyDemo
```

Si Windows refuse l’enregistrement d’une tâche au démarrage, ouvrez PowerShell **en tant qu’administrateur avec le même compte** et relancez. Ne configurez pas le serveur avec le compte SYSTEM, ni avec un autre compte : la configuration et les droits de données sont liés au compte choisi.

3. Ouvrez le **Planificateur de tâches → Bibliothèque → InfinityTherapyDemo**. Vérifiez le déclencheur Au démarrage et « Exécuter même si l’utilisateur n’est pas connecté ».
4. Redémarrez le PC et vérifiez l’adresse HTTPS avant d’ouvrir la session Windows. Ce test doit être fait sur votre PC ; il n’a pas été exécuté dans l’environnement Linux de développement.
5. Si vous changez le mot de passe Windows ou déplacez le projet, mettez à jour la configuration et réenregistrez la tâche.

Le serveur gère SIGINT/SIGTERM proprement. Windows peut cependant terminer de force une tâche ou un processus à l’extinction : SQLite utilise son journal WAL et des écritures synchrones pour conserver les transactions confirmées et récupérer après un arrêt brutal. Cela ne remplace pas une sauvegarde ni un test réel d’extinction Windows.

## 7. Ouvrir depuis les iPhones en 5G

1. Installez **Tailscale** depuis l’App Store sur chacun des iPhones.
2. Connectez chaque personne avec son compte Tailscale autorisé, approuvez l’appareil puis activez le VPN Tailscale.
3. Désactivez le Wi-Fi pour le test et vérifiez la 5G.
4. Dans Safari, ouvrez **la même adresse HTTPS Tailscale que sur le PC**.
5. Connectez chaque personne avec son propre compte Infinity Therapy.
6. Facultatif : dans Safari → Partager → **Sur l’écran d’accueil**.

Testez une transmission fictive : elle doit apparaître dans le suivi sur l’autre appareil en environ cinq secondes lorsque la liste est visible. Le secrétariat la copie, la colle manuellement dans Titan, puis la marque comme saisie. Cette version ne communique jamais directement avec Titan.

PC éteint, en veille ou déconnecté : l’application est indisponible. Elle ne fonctionne pas hors ligne. Le formulaire ouvert conserve votre saisie à l’écran après une erreur réseau ; ne fermez pas et ne rechargez pas la page si vous souhaitez la garder. Après une réponse perdue, consultez l’historique avant de renvoyer une transmission.

## 8. Sauvegarder

Faites des sauvegardes régulières, avant chaque mise à jour et avant une restauration. Choisissez un support privé chiffré, par exemple une clé chiffrée gardée en lieu sûr. Une sauvegarde contient aussi les comptes hachés : elle est confidentielle même dans cette démonstration.

Depuis le terminal du projet, sous le même compte Windows :

```powershell
$env:INFINITY_DATA_DIR = Join-Path $env:LOCALAPPDATA 'InfinityTherapyDemo'
node .\scripts\backup.js 'E:\SauvegardesInfinity\demo-2026-11-04.sqlite'
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
node .\scripts\restore.js 'E:\SauvegardesInfinity\demo-2026-11-04.sqlite' --server-stopped
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
