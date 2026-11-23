# Mise à jour Windows vers Infinity Therapy 2.6.3

Le serveur Node charge les règles des bilans au démarrage et lit les fichiers de l’interface sur disque à chaque requête. Une copie des nouveaux fichiers pendant que l’ancien serveur tourne peut donc laisser les anciennes règles en service. La version 2.6.3 vérifie la version de l’API, des règles et du PDF auprès du processus qui répond réellement.

La correction d’un bilan finalisé est réservée à son propriétaire ou à l’administration. Elle conserve sa date clinique, archive les versions et réactualise le PDF après relecture. Les déclarations manuelles Titan et Topaz restent indépendantes.

## Installation existante avec la tâche Windows

1. [Télécharger le ZIP GitHub de la branche main](https://github.com/amelieaubertmk-sketch/infinity-therapy-ehpad/archive/refs/heads/main.zip). Si Windows affiche « Débloquer » dans les propriétés du ZIP téléchargé depuis le dépôt officiel, cocher cette option. Extraire le ZIP dans un dossier temporaire. Les archives de correctifs 2.6.0 et 2.6.1 correspondent à leurs versions historiques.
2. Ouvrir PowerShell dans le dossier extrait, avec le compte Windows de la tâche `InfinityTherapyDemo`. Arrêter la saisie pendant la mise à jour.
3. Exécuter la commande suivante. Le script lit le dossier `project` dans `config.json`, vérifie l’archive, arrête la tâche, sauvegarde les données et le code puis remplace les fichiers de la version. La sauvegarde est créée par défaut dans `%LOCALAPPDATA%\InfinityTherapyBackups`. L’option `-BackupRoot` accepte un dossier privé protégé par l’établissement.

   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File .\scripts\update-windows.ps1
   ```

4. Attendre **Infinity Therapy 2.6.3 vérifiée**. Le contrôle couvre la réponse du serveur après redémarrage et le contenu des modules JavaScript servis. Ouvrir votre adresse habituelle, actualiser la page et vérifier **Version 2.6.3** en bas de page.

Le script reconnaît la tâche qui lance `start-windows.ps1` ainsi que la variante PowerShell `-EncodedCommand` qui charge le même `config.json` et démarre `server.js`. Si le script indique que le port est toujours occupé, fermer le serveur Infinity Therapy éventuellement lancé à la main puis relancer la mise à jour. En cas d’échec après la copie du code, lire le chemin de sauvegarde affiché avant de relancer la tâche. Le répertoire `code` de la sauvegarde contient les versions précédentes des fichiers remplacés. La mise à jour utilise la base et la configuration existantes.

Pour une installation lancée à la main, arrêter le serveur, appliquer le remplacement du code dans le dossier `project`, puis relancer avec le même dossier de données. Depuis l’archive extraite, le diagnostic suivant lit les chemins configurés et vérifie la version servie, sans ouvrir la base de données.

```powershell
node .\scripts\diagnose-bilans.js
```

La sortie doit contenir `"matches": true` pour `runtime` et les trois valeurs `api`, `rules` et `pdf` à `2.6.3`.
