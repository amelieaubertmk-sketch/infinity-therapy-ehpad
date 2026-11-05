# Infinity Therapy — Transmissions EHPAD

L’application existante évolue en **démonstration multiutilisateur privée**, avec Node.js 24 LTS, SQLite sur le PC Windows 11 et accès HTTPS via Tailscale Serve. Aucun hébergement cloud de la base, aucune ouverture de port sur la box, aucun Docker et aucune dépendance npm de production.

**Exclusivement des données fictives. Cette version n’est pas autorisée à traiter des données médicales réelles et ne revendique aucune conformité RGPD ou HDS.**

## Démarrer sans connaissances techniques

Suivez [le guide Windows 11 et iPhone, étape par étape](docs/INSTALLATION-WINDOWS.md). Il couvre l’installation, la création des comptes, Tailscale, le démarrage automatique, les sauvegardes, la restauration, les mises à jour et le dépannage.

- [Sécurité, rôles et vérifications avant une éventuelle production](docs/SECURITE.md)
- [Architecture, API et tests](docs/ARCHITECTURE.md)
- [Ancien guide de la démonstration locale GitHub Pages](docs/DEMO-LOCALE.md) : les instructions de lancement de cet ancien document sont remplacées par le guide Windows pour le serveur privé.

## Deux espaces, trois rôles

L’identité visuelle, les écrans Boss et Kiné et les parcours cliniques sont conservés. Les ajouts nécessaires sont l’écran de connexion, le compte connecté, l’état réseau, et dans Boss les onglets Utilisateurs et Journal des actions.

| Fonction | Administratrice | Kiné | Secrétariat |
| --- | --- | --- | --- |
| Résidents et modèles | Gérer | Consulter pour préparer une séance | Liste utile au suivi |
| Créer une transmission / séance non réalisée | Oui | Oui | Non |
| Consulter les transmissions | Oui | Oui | Oui |
| Copier et suivre les statuts Titan | Oui | Oui | Oui |
| Annuler une transmission avec motif | Oui | Oui | Non |
| Comptes et journal des actions | Oui | Non | Non |

Ces droits sont vérifiés côté serveur. Le praticien choisi dans une séance reste indépendant du compte connecté. Les textes des transmissions en attente restent indépendants des modèles ; l’archivage et l’annulation motivée sont conservés. Après confirmation de saisie Titan, la transmission est supprimée de la base active et de l’historique. Copier ne marque jamais automatiquement une saisie Titan.

## Données partagées

Les écritures sont confirmées par le serveur avant tout message de succès. Un rafraîchissement toutes les cinq secondes actualise le suivi lorsque la page est visible. Les formulaires et fenêtres ouverts ne sont pas remplacés pendant leur saisie. Un numéro de révision interdit les écrasements silencieux ; en cas de conflit, rechargez les données avec le bouton proposé puis vérifiez et soumettez de nouveau. Aucune file d’envoi hors connexion : si le PC est inaccessible, la saisie reste dans le formulaire tant que la page n’est pas fermée ou rechargée. Si une réponse réseau a été perdue, vérifiez l’historique avant de valider de nouveau, car une écriture peut avoir été enregistrée sans que sa confirmation vous soit parvenue.

La base se trouve **hors du dépôt**, dans `%LOCALAPPDATA%\InfinityTherapyDemo` après configuration Windows. Elle contient les comptes hachés, les sessions, l’audit et les données fictives. Le fichier SQLite n’est pas chiffré par l’application : protégez le compte Windows, le disque et les sauvegardes.

## Démonstration publique et serveur privé

GitHub Pages conserve la démonstration fictive locale, explicitement identifiée, sans compte et sans synchronisation. Elle n’accède jamais au serveur privé. L’adaptateur local est sélectionné uniquement sur un nom d’hôte se terminant par `.github.io`. Sur le PC privé, une panne réseau ne déclenche jamais de retour au stockage local. Les données déjà saisies dans l’ancienne démonstration restent dans son navigateur ; aucune importation automatique n’est effectuée. Les six résidents initiaux du serveur sont fictifs et leurs modèles sont modifiables depuis Boss.

Pour la synchronisation, les trois utilisateurs doivent ouvrir **la même adresse HTTPS Tailscale du PC**, et non l’ancien lien GitHub Pages.

## Développement local (Node.js 24.13 ou supérieur)

```sh
npm run user:create
npm start
```

Le premier compte doit avoir le rôle `admin`. Choisissez ses identifiants et un mot de passe d’au moins 12 caractères dans les invites du terminal. Ouvrez `http://localhost:3000`. Le serveur écoute uniquement `127.0.0.1` ; l’accès distant passe par le proxy HTTPS Tailscale. Aucun package n’est à installer. Les paramètres sont `INFINITY_DATA_DIR`, `INFINITY_ORIGIN` et `PORT`. Par défaut, les données de développement sont dans `InfinityTherapyDemo` sous le dossier personnel.

```sh
npm test
```

Tests navigateur, avec Playwright disponible dans l’environnement de développement :

```sh
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tests/private-browser.mjs
```

`CHROMIUM_PATH` permet de choisir le binaire Chromium. Les tests utilisent exclusivement des comptes et des bases temporaires fictifs. Voir le rapport de validation dans `docs/ARCHITECTURE.md`. Les scripts PowerShell et Tailscale doivent encore être validés sur votre véritable PC Windows et vos iPhones.

## Suppression définitive et conservation après Titan — version 2.1

Dans **Boss → Résidents & modèles**, le bouton **Supprimer définitivement** efface le résident, ses quatre modèles et toutes ses transmissions encore présentes, après confirmation indiquant leur nombre. Seule l’administratrice dispose de ce droit sur le serveur privé. L’archivage reste disponible comme alternative réversible.

**Marquer comme saisi sur Titan**, ou choisir ce même statut dans le menu, demande maintenant une confirmation explicite d’effacement. Après confirmation du serveur, la transmission entière est supprimée de la base active : texte, observation, dates, identité du résident et historique de statuts de cette entrée. Elle ne peut plus être retrouvée ni son statut corrigé dans l’application. Copier seul ne supprime jamais rien. Les compteurs décrivent les entrées encore présentes ; aucun compteur nominatif des saisies supprimées n’est conservé.

Pour les transmissions déjà marquées comme saisies avant la mise à jour, Boss affiche **Effacer les anciennes saisies Titan** lorsqu’il en existe : confirmez pour les nettoyer. Une nouvelle confirmation Titan retire également les anciennes entrées déjà marquées saisies. Les transmissions en attente et annulées ne sont pas effacées par ce nettoyage.

La base privée utilise SQLite `secure_delete` et tente de tronquer son journal WAL après ces effacements. Cela ne constitue pas une garantie d’effacement physique sur le disque, les snapshots système ou un SSD. Les sauvegardes antérieures, les copies déjà exportées/collées et un ancien navigateur non actualisé peuvent conserver des données. Le journal d’audit conserve des événements techniques sans le texte supprimé ; des références techniques d’actions antérieures peuvent subsister. Les sauvegardes ne sont jamais détruites automatiquement.

Sur le PC du cabinet, installez la nouvelle version du code selon [la procédure de mise à jour](docs/INSTALLATION-WINDOWS.md#10-mettre-à-jour-sans-perdre-les-données), puis redémarrez le serveur. Actualiser Safari seul ne met pas le serveur Windows à jour. Ces fonctions restent destinées aux données fictives.
