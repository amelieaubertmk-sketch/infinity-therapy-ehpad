> Document historique de la version locale publique. Pour le nouveau serveur privé, suivre INSTALLATION-WINDOWS.md ; les anciennes commandes de démarrage ne décrivent plus le serveur actuel.

# Infinity Therapy — Transmissions EHPAD

Démonstration fonctionnelle en français pour préparer les transmissions de kinésithérapie et suivre leur saisie manuelle dans Titan. **Données entièrement fictives uniquement.**

## 1. Lancer l’application

Installez Node.js 20 ou une version plus récente (version 24 utilisée pour les tests). Ouvrez un terminal dans ce dossier puis exécutez :

```sh
npm start
```

Ouvrez `http://localhost:3000` dans votre navigateur. Gardez le terminal ouvert pendant l’utilisation. Pour arrêter : Ctrl+C. Aucune installation de dépendances ni création de compte n’est nécessaire. Pour changer le port : `PORT=3001 npm start` sous macOS/Linux.

Les six résidents et leurs textes initiaux sont fictifs. La première ouverture initialise la démonstration. Les données sont conservées dans le stockage local du navigateur. Elles survivent au rechargement, mais leur suppression dans les paramètres du navigateur les efface. Un autre navigateur, un autre appareil ou une autre adresse dispose de sa propre démonstration. Les sessions privées peuvent effacer les données à leur fermeture. Il n’y a pas de sauvegarde distante. Utilisez un seul onglet pour la modification : lorsqu’un autre onglet change les données, l’interface demande un rechargement pour éviter d’écraser ses modifications.

## 2. Accéder à Boss

Cliquez sur **Boss**, en haut. Cet espace contient les résidents actifs, les archives, les quatre modèles de chaque résident, les compteurs et le suivi administratif filtrable. Dans cette démonstration, les deux espaces sont accessibles sans mot de passe ; ce choix ne constitue pas un système d’autorisation.

## 3. Accéder à Kiné

Cliquez sur **Kiné**. Vous disposez de deux onglets : **Nouvelle transmission** et **Transmissions à saisir dans Titan**. Le second permet également d’ouvrir l’historique.

## 4. Ajouter un résident fictif

Dans Boss, cliquez sur **Ajouter un résident**. Indiquez un code fictif et choisissez Premier étage, Deuxième étage ou Maisonnée. Complétez les quatre modèles puis enregistrez. Vous pouvez laisser un modèle vide ; aucun texte ne sera inventé. Chaque résident possède un identifiant technique unique, même si plusieurs codes sont identiques. Une référence permet de les distinguer dans la liste ; le sélecteur quotidien la montre pour les codes identiques dans le même secteur.

Pour changer le code ou le secteur, utilisez **Modifier & modèles**. **Archiver** retire le résident de la saisie quotidienne en conservant son historique. Dans **Archives**, **Réactiver** le rend de nouveau disponible.

## 5. Modifier une transmission préenregistrée (modèle)

Dans Boss, recherchez le résident puis cliquez sur **Modifier & modèles**. Modifiez librement Marche, Transfert, Renforcement musculaire et/ou Soins, puis enregistrez. Les prochaines sélections utilisent les nouveaux textes. Les transmissions déjà validées conservent leur texte et les informations du résident au moment de leur validation.

## 6. Enregistrer une transmission quotidienne

1. Ouvrez Kiné → Nouvelle transmission.
2. Vérifiez la date, présélectionnée au jour courant de votre appareil.
3. Choisissez le secteur puis le résident actif. Un champ permet de rechercher son code.
4. Sélectionnez Amélie ou Alexandre, indépendamment de l’espace utilisé.
5. Choisissez l’activité et relisez le modèle affiché. Vous pouvez l’adapter pour cette séance uniquement. Changer de résident ou d’activité recharge le modèle correspondant.
6. Ajoutez, si nécessaire, une observation exceptionnelle : elle sera ajoutée sous « Observation complémentaire ».
7. Cliquez volontairement sur **Valider la transmission**. Une confirmation d’enregistrement s’affiche. Un doublon potentiel (même résident, date et activité) demande confirmation, sans interdire plusieurs séances.

Si la séance n’a pas eu lieu, cochez **La séance n’a pas été réalisée**, indiquez le motif et enregistrez. Le texte final mentionne uniquement la non-réalisation et le motif, sans reprendre le texte de soins. Ces entrées ne sont pas comptées comme transmissions de soins réalisées.

Dans **Transmissions à saisir dans Titan**, ouvrez une ligne puis cliquez sur **Copier la transmission**. Seul le texte final est copié, sans les métadonnées. Collez-le manuellement dans Titan. La copie ne modifie jamais le statut. Le presse-papiers automatique nécessite un contexte sécurisé (HTTPS ou localhost) ; sinon l’application sélectionne le texte pour une copie manuelle.

Après la saisie effective dans Titan, cliquez sur **Marquer comme saisi sur Titan** et confirmez. La ligne quitte la liste d’attente mais reste dans l’historique. Le menu de statut permet aussi de passer à **En cours de saisie**, de revenir à **À saisir**, ou de corriger une erreur, avec confirmation. L’historique local des changements de statut est consultable dans le détail.

## 7. Tester sur votre iPhone

1. Démarrez l’application sur votre ordinateur avec `npm start`.
2. Connectez l’ordinateur et l’iPhone au même Wi-Fi privé.
3. Relevez l’adresse IP locale de l’ordinateur dans ses paramètres réseau (par exemple `192.168.1.20`).
4. Sur Safari, ouvrez `http://192.168.1.20:3000`, en remplaçant l’adresse par celle de votre ordinateur. Autorisez le serveur sur le réseau privé dans le pare-feu si nécessaire.
5. Testez avec des informations fictives. Les données de l’iPhone seront distinctes de celles de l’ordinateur. Sur cette adresse HTTP locale, utilisez la copie manuelle si la copie automatique est indisponible.

Cette procédure nécessite une exécution sur votre ordinateur. Le port de l’environnement cloud n’est pas automatiquement accessible depuis votre Wi-Fi. Aucun déploiement public n’est effectué par ce projet. Une publication statique de cette démonstration fictive est techniquement possible, mais ne fournit ni partage des données, ni authentification.

## 8. Passer à une version collaborative sécurisée

La démonstration **n’est pas adaptée aux données réelles de santé et ne revendique aucune conformité RGPD/HDS**. Les codes abrégés ne rendent pas des données réelles anonymes. N’enregistrez aucune information personnelle ou médicale réelle ici.

La version professionnelle nécessitera :

- Des comptes individuels avec authentification sécurisée et gestion des sessions.
- Des autorisations contrôlées côté serveur, indépendantes de la navigation Boss/Kiné et du praticien choisi pour la séance (administration, saisie clinique, suivi Titan).
- Une API et une base centralisée, des mises à jour avec gestion des conflits, puis une synchronisation temps réel.
- Des validations serveur, un journal d’audit protégé et des instantanés historiques immuables ; le journal local de démonstration n’est pas un audit de sécurité.
- Une infrastructure et des contrats adaptés aux obligations applicables, dont HDS lorsque requis, chiffrement, sauvegardes testées, politique de conservation, supervision et gestion des accès.
- Une validation métier et juridique avant toute utilisation réelle. Aucun transfert automatisé vers Titan n’est implémenté.

Ne pas utiliser localStorage, GitHub Pages, un hébergement statique ou une feuille de calcul ordinaire pour les données réelles de cette application.

## Organisation technique et validation

Application sans dépendance de production et sans compilation :

- `index.html`, `src/style.css`, `src/app.js` : interface responsive et interactions.
- `src/domain.js` : résidents fictifs, modèles, validation, instantanés, statuts.
- `src/store.js` : adaptateur de persistance locale versionnée, à remplacer par un accès API pour la version collaborative.
- `server.js` : serveur de fichiers Node.js limité aux ressources publiques, avec politique de sécurité du contenu. Ce n’est pas un serveur métier ni un serveur de production.

Tests métier :

```sh
npm test
```

Le parcours navigateur est dans `tests/browser.mjs`. Dans un environnement disposant de Playwright et Chromium, démarrez d’abord le serveur puis exécutez :

```sh
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tests/browser.mjs
```

`CHROMIUM_PATH` permet de choisir un autre binaire Chromium. Playwright est uniquement un outil de test externe, pas une dépendance nécessaire au lancement de l’application. Les données de test navigateur sont isolées dans un contexte temporaire.

## Publication de la démonstration sur GitHub Pages

Les chemins des ressources sont relatifs pour supporter l’adresse d’un projet GitHub Pages. Dans le dépôt GitHub, ouvrez **Settings → Pages**, choisissez **Deploy from a branch**, puis **main** et **/(root)**, et cliquez sur **Save**. GitHub affiche ensuite l’adresse publiée et l’état du déploiement. Cette publication reste réservée aux tests fictifs ; les données restent locales à chaque navigateur.

## Annuler une transmission validée par erreur

Dans Kiné → Transmissions à saisir dans Titan, cliquez sur **Ouvrir**, indiquez un **motif d’annulation**, puis cliquez sur **Annuler cette transmission** et confirmez. Une transmission déjà saisie est accessible par **Voir l’historique**. L’entrée annulée est retirée des attentes et des compteurs de soins/saisies ; elle reste dans l’historique avec le texte d’origine, le motif, la date d’annulation et le statut précédent. Le filtre **Annulée** permet de la retrouver. Elle ne peut plus être copiée ou marquée comme saisie. Au besoin, créez une nouvelle transmission correcte. Si le texte a déjà été saisi dans Titan, corrigez-le aussi directement dans Titan : l’application ne le modifie pas.
