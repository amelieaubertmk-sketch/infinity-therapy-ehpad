# Infinity Therapy — Transmissions EHPAD

**404 Bilans persistant après 2.6.1** : [réparation guidée du projet réellement configuré](docs/REPARATION-INSTALLATION-BILANS-2.6.1.md). Le script Windows à lancer manuellement sauvegarde, répare la liste statique, restaure les modules si nécessaire, redémarre la tâche existante et contrôle les sept modules HTTP. [Rapport de tests](docs/VALIDATION-REPARATION-BILANS-2.6.1.md).

**Correctif ciblé 2.6.1 — chargement des Bilans** : [diagnostic, fichiers et remplacement Windows sans réinitialisation](docs/CORRECTION-BILANS-2.6.1.md), [rapport de tests](docs/VALIDATION-2.6.1.md). Le formulaire et les données 2.6.0 restent conservés.

**Version 2.6.0 — refonte des Bilans résidents** : [installation complète Windows avec sauvegarde](docs/MISE-A-JOUR-2.6.0.md), [guide du formulaire compact, de la corbeille et du suivi Titan](docs/BILANS-RESIDENTS-2.6.0.md), [tests, migrations et fichiers modifiés](docs/VALIDATION-2.6.0.md). Les transmissions restent inchangées. Les PDF de bilans sont désormais exportés sans identifiant résident, après confirmation du dossier dans l’application.

**Version corrigée 2.5.1 — page blanche après mise à jour partielle** : [réparation Windows avec sauvegarde](docs/MISE-A-JOUR-2.5.1.md). Remplacer tous les dossiers de code concernés puis redémarrer le serveur ; conserver la base et `config.json`.

**Version complète 2.5.0** : [installation Windows et sauvegarde](docs/MISE-A-JOUR-2.5.0.md), [guide Bilans résidents](docs/BILANS-RESIDENTS.md), [tests et fichiers livrés](docs/VALIDATION-2.5.0.md). Cette livraison intègre les ajustements ergonomiques et les bilans ; aucune installation intermédiaire 2.4.1 n’est nécessaire.

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
| Supprimer une ligne de suivi Titan | Oui | Non | Non |
| Comptes et journal des actions | Oui | Non | Non |

Ces droits sont vérifiés côté serveur. Le praticien choisi dans une séance reste indépendant du compte connecté. Les textes des transmissions en attente restent indépendants des modèles ; l’archivage et l’annulation motivée sont conservés. Après confirmation de saisie Titan, le texte et les observations sont supprimés ; une ligne de suivi reste dans l’historique. Copier ne marque jamais automatiquement une saisie Titan.

## Données partagées

Les écritures sont confirmées par le serveur avant tout message de succès. Un rafraîchissement toutes les cinq secondes actualise le suivi lorsque la page est visible. Les formulaires et fenêtres ouverts ne sont pas remplacés pendant leur saisie. Un numéro de révision interdit les écrasements silencieux ; en cas de conflit, rechargez les données avec le bouton proposé puis vérifiez et soumettez de nouveau. Aucune file d’envoi hors connexion : si le PC est inaccessible, la saisie reste dans le formulaire tant que la page n’est pas fermée ou rechargée. Si une réponse réseau a été perdue, vérifiez l’historique avant de valider de nouveau, car une écriture peut avoir été enregistrée sans que sa confirmation vous soit parvenue.

La base se trouve **hors du dépôt**, dans `%LOCALAPPDATA%\InfinityTherapyDemo` après configuration Windows. Elle contient les comptes hachés, les sessions, l’audit et les données fictives. Le fichier SQLite n’est pas chiffré par l’application : protégez le compte Windows, le disque et les sauvegardes.

## Démonstration publique et serveur privé

GitHub Pages conserve la démonstration fictive locale, explicitement identifiée, sans compte et sans synchronisation. Elle n’accède jamais au serveur privé. L’adaptateur local est sélectionné uniquement sur un nom d’hôte se terminant par `.github.io`. Sur le PC privé, une panne réseau ne déclenche jamais de retour au stockage local. Les données déjà saisies dans l’ancienne démonstration restent dans son navigateur ; aucune importation automatique n’est effectuée. Une nouvelle installation privée démarre sans résident. Ajoutez les résidents et leurs modèles depuis Boss. Les résidents exemples ne sont utilisés que dans les tests et l’ancienne interface publique locale.

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

## Suppression définitive et suivi après Titan — version 2.2

Dans **Boss → Résidents & modèles**, **Supprimer définitivement** efface le résident, ses quatre modèles, toutes ses transmissions restantes et ses lignes de suivi Titan, après confirmation. Seule l’administratrice dispose de ce droit sur le serveur privé. L’archivage reste une alternative réversible.

**Marquer comme saisi sur Titan**, ou choisir ce statut dans le menu, demande une confirmation d’effacement du contenu. Après confirmation du serveur :

- Le texte, l’observation, le motif de non-réalisation éventuel et les champs complémentaires de la transmission sont supprimés de la base active.
- Une ligne de suivi reste dans **Voir l’historique**, par exemple : **05/11/2026 · ARB. · Premier étage · Marche · Saisi sur Titan**. Le praticien et les dates de validation/confirmation sont conservés pour les filtres et le suivi. Une séance non réalisée garde uniquement un indicateur sans son motif.
- **Voir le suivi** affiche ces seules informations, sans texte et sans bouton Copier, Annuler ou Modifier le statut. Il n’est pas possible de rétablir le contenu ou de rouvrir cette ligne comme une transmission à saisir.
- Le compteur **Saisies sur Titan** compte ces lignes. Les attentes Titan n’incluent pas les lignes déjà saisies. **Copier seul ne supprime jamais rien.**

Les anciens enregistrements encore présents et marqués saisis sont convertis automatiquement en lignes sans contenu au redémarrage du serveur mis à jour ; les autres entrées restent inchangées. Le nettoyage est également appliqué au chargement de l’ancienne démonstration locale. Les transmissions déjà entièrement supprimées avec la version 2.1 ne peuvent pas être recréées automatiquement : aucune donnée permettant leur reconstitution n’a été conservée.

SQLite utilise `secure_delete` et tente de tronquer son journal WAL après les effacements. Cela ne garantit pas l’effacement physique des anciennes données sur un SSD ou dans des snapshots système. Les sauvegardes antérieures, copies déjà exportées/collées et anciens onglets non actualisés peuvent contenir l’ancien texte. Les sauvegardes ne sont pas détruites automatiquement. Le journal d’audit conserve des événements techniques sans le texte supprimé.

Sur le PC du cabinet, installez la nouvelle version du code selon [la procédure de mise à jour](docs/INSTALLATION-WINDOWS.md#10-mettre-à-jour-sans-perdre-les-données), puis redémarrez le serveur. Actualiser Safari seul ne met pas le serveur Windows à jour. Ces fonctions restent destinées aux données fictives.

## Présentation de l’interface — version 2.2.1

Les mentions « démonstration » ont été retirées des écrans à la demande de l’utilisatrice. Les indications de stockage local ou de connexion au serveur restent visibles. Cette modification de présentation ne change ni les protections, ni les limites de sécurité documentées, et ne constitue pas une validation pour des données de santé réelles. Les données initiales restent fictives.

## Liste du cabinet vide — version 2.3

Les nouvelles bases privées démarrent avec une liste vide. Une mise à jour ne supprime pas silencieusement les données d’un cabinet existant : après avoir installé les nouveaux fichiers et redémarré le serveur, connectez-vous à Boss, ouvrez **Résidents & modèles**, puis **Supprimer tous les résidents**. Saisissez **SUPPRIMER** et confirmez. Cette action efface les résidents actifs et archivés, leurs modèles, les transmissions et les lignes de suivi Titan de la base active. Elle préserve vos comptes, mots de passe et paramètres. Aucun exemple n’est recréé au redémarrage. Le bouton individuel **Supprimer définitivement** reste disponible.

La confirmation Titan conserve uniquement la ligne de suivi décrite dans la section précédente, sans texte ni observations. Les mentions « démo » ont déjà été retirées de l’interface. Le retrait de ces mentions ne certifie pas l’application pour des données de santé réelles. Les anciennes sauvegardes, les copies externes et certains événements techniques non cliniques ne sont pas effacés par le vidage : il ne s’agit pas d’une garantie d’absence de toute trace sur les supports.

## Retirer une ligne de suivi Titan — version 2.3.1

Avec votre compte administrateur : **Kiné → Transmissions à saisir dans Titan → Voir l’historique → Voir le suivi → Supprimer cette ligne de suivi**, puis confirmez. La ligne disparaît de la base active et du compteur des saisies. Le résident, ses modèles et les autres transmissions restent inchangés. Cette action ne touche pas Titan et ne restaure aucun texte déjà effacé. Seule l’administratrice peut supprimer une ligne de suivi ; le serveur contrôle ce droit. Les anciennes sauvegardes ne sont pas modifiées et un événement technique sans le contenu est conservé dans l’audit.

## Recherche rapide du résident — version 2.3.2

Dans le formulaire de transmission, tapez les trois premières lettres du code dans **Rechercher un résident**. La recherche parcourt les résidents actifs de tous les secteurs, sans tenir compte des majuscules, accents, espaces ou points. Un résultat unique est sélectionné automatiquement à partir de trois caractères utiles, le bon secteur est activé et le modèle de l’activité est affiché. Si plusieurs résidents correspondent, choisissez la bonne ligne dans le menu, qui indique le secteur. Les résidents archivés sont exclus. Aucun résultat laisse la sélection vide ; la touche Entrée dans ce champ ne valide jamais une transmission. Cliquer sur un secteur remet la recherche à zéro et affiche sa liste complète.

## Supprimer une transmission annulée — version 2.3.3

Avec le compte administrateur, ouvrez **Kiné → Transmissions à saisir dans Titan → Voir l’historique**, puis **Ouvrir** sur la ligne **Annulée**. Cliquez sur **Supprimer définitivement cette transmission annulée** et confirmez. La ligne, son contenu et son motif sont retirés de la base active ; le résident, ses modèles et les autres transmissions restent inchangés. Les sauvegardes antérieures restent inchangées et un événement technique sans contenu est conservé dans l’audit. Aucun changement n’est effectué dans Titan.

## Version 2.4.0 — sélection, export local et corbeille

Consultez [la procédure de mise à jour Windows avec sauvegarde et retour arrière](docs/MISE-A-JOUR-2.4.md). Sélection multiple dans les listes et l’historique, export Excel sans texte médical, suppression groupée admin vers une corbeille récupérable et auditée, tri chronologique et repères de dates, filtre et regroupement par kiné. Les compteurs incluent désormais les séances non réalisées de façon cohérente. Aucun effacement automatique de la corbeille. Aucun changement de configuration Tailscale.

Tests complémentaires navigateur : `PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tests/bulk-browser.mjs`. Les données et comptes du cabinet ne sont pas utilisés par ces tests.

## Ajustements ergonomiques préparés puis intégrés à la version 2.5.0

Dans les transmissions à saisir, conserver les badges de dates et réserver sélection, export et corbeille à l’historique. L’historique affiche des dates neutres. Le regroupement distingue AMÉLIE (rose) et ALEXANDRE (bleu), avec le nombre de transmissions filtrées. Les autorisations, données et règles de conservation restent inchangées. Voir [la mise à jour Windows 11 et les tests](docs/MISE-A-JOUR-2.4.1.md).

## Version 2.5.0 — bilans résidents et interface des transmissions

Nouvel espace principal indépendant : bilans initiaux, réévaluations, brouillons serveur, tests avec états de réalisation, modèles locaux de diagnostic et projet à valider, historique immuable, comparaisons et PDF local A4 avec polices embarquées. Les bilans sont inclus dans les sauvegardes SQLite existantes. Aucun changement de comptes, de praticiens, de statuts Titan, de Tailscale ou de démarrage Windows.

Les tests navigateur du module sont dans `tests/assessments-browser.mjs` ; les tests ergonomiques dans `tests/ergonomics-browser.mjs`. Voir le rapport 2.5.0 pour les commandes et les limites, dont la vérification nécessaire sur iPhone/Safari physique.

## Version 2.5.1 — démarrage après mise à jour partielle

Les imports principaux sont contrôlés ; un échec affiche une aide au lieu d’un écran vide. Les bilans sont chargés à l’ouverture de leur onglet : un module absent ne bloque plus les transmissions. Tous les imports du navigateur utilisent la même référence de version pour éviter les anciens modules en cache. Aucun changement de données, d’autorisations ou de configuration Windows/Tailscale. Test de régression : `PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node tests/startup-browser.mjs`.

## Bilans résidents 2.6.0

Formulaire conditionnel compact, MRC 0/NE distincts, aides partagées entre marche/TUG/Tinetti, Tinetti guidé et partiel, transferts simples, génération locale des deux textes et validation professionnelle. Suppression récupérable des brouillons autorisés, suivi manuel des bilans à intégrer dans Titan, PDF A4 sans identifiant patient et conservation des documents/versions dans SQLite. Aucun service externe ni changement Tailscale ou de démarrage Windows.

Les anciens bilans ne sont pas convertis ; les trois tables ajoutées conservent le suivi, les versions et les PDF. L’absence d’identifiant dans un PDF ne garantit pas une anonymisation complète du texte clinique. Lire le guide avant mise à jour et effectuer une sauvegarde complète.
