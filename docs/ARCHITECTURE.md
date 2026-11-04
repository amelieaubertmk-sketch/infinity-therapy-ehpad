# Architecture et validation

## Évolution du projet existant

Les fichiers d’interface sont conservés : `src/app.js`, `src/style.css` et `index.html`. Les règles métier demeurent dans `src/domain.js`. `src/store.js` est maintenant un adaptateur asynchrone : les écritures attendent l’API. `src/demo-store.js` conserve uniquement l’ancienne démonstration publique fictive sur `.github.io`. Il n’existe aucune bascule locale après un échec du serveur privé.

Le serveur Node.js 24 utilise uniquement les modules natifs, dont `node:sqlite`. Les modules métier sont partagés avec le serveur ; celui-ci valide les droits et reconstruit les transmissions et les changements de statut sans accepter aveuglément les champs historiques du client.

SQLite contient :

- `state` : résidents avec modèles et transmissions historiques, instantané JSON versionné et révision globale.
- `users` : comptes, rôle, activation, mot de passe scrypt.
- `sessions` : hachages de jetons, protection CSRF et expiration.
- `audit` : horodatage, compte et identifiants d’action/cible, sans contenu clinique.
- `attempts` : limitation des tentatives de connexion.

L’instantané JSON dans SQLite garde l’architecture légère pour une petite démonstration. Ce n’est pas un schéma relationnel dimensionné pour des années de production ; les écritures envoient un instantané et sont limitées à 2 Mo par requête. Une version de production devra disposer d’API ciblées, pagination, migrations de schéma et politique de conservation. Une seule action métier est acceptée par écriture ; aucun écrasement complet libre de la base n’est autorisé.

## Routes API

Toutes les routes sauf la connexion exigent une session. Les écritures exigent aussi l’origine autorisée et le jeton CSRF.

| Route | Usage |
| --- | --- |
| `POST /api/login` | Connexion individuelle et cookie de session |
| `GET /api/me` | Compte courant et protection CSRF |
| `POST /api/logout` | Révoquer la session |
| `GET /api/state` | Lire les données fictives partagées et la révision |
| `PUT /api/state` | Appliquer une action autorisée avec révision attendue |
| `GET /api/users` | Liste des comptes sans hachages, administratrice seulement |
| `POST /api/users` | Ajouter/modifier/désactiver/réinitialiser un compte, administratrice seulement |
| `GET /api/audit` | 200 dernières actions, administratrice seulement |

Un conflit de révision répond 409. Le client ne renvoie pas automatiquement une écriture incertaine. Les créations, statuts et annulations reçoivent leurs dates définitives du serveur. Le praticien indiqué est une donnée de séance ; le compte auteur est conservé indépendamment.

## Réseau et processus

```text
Safari iPhone (5G + VPN Tailscale)
                 |
     HTTPS privé, règles Tailscale
                 |
       Tailscale Serve sur Windows
                 |
          127.0.0.1:3000
                 |
         Node.js -> SQLite disque local
```

Le serveur vérifie Origin contre `INFINITY_ORIGIN`. Pour Host, il accepte ce nom et les adresses loopback du port d’écoute, afin de supporter un proxy local qui réécrit Host. Les écritures exigent toujours l’origine HTTPS exacte configurée. Il ne fait pas confiance aux en-têtes Tailscale pour accorder des droits. Node ne termine pas lui-même TLS ; Serve le fait sur le même PC. L’adresse publique GitHub Pages ne peut pas communiquer avec la base privée.

La tâche planifiée Windows lance le serveur sous le compte configuré, à privilèges limités. Les processus ne font pas partie d’une sauvegarde ni d’un snapshot cloud. SQLite WAL avec synchronisation FULL protège les transactions confirmées ; sauvegarder utilise l’API SQLite de sauvegarde plutôt que de copier un fichier actif.

## Validation automatisée

`npm test` exécute huit tests métier et un scénario d’intégration API regroupant :

- Trois connexions individuelles, authentification exigée et absence de hachages dans les réponses.
- Administration réservée, refus de création/annulation pour le secrétariat et contrôle serveur du texte historique.
- Création fictive, lecture depuis un autre compte et statut Titan partagé.
- Rejet des conflits, de l’origine incorrecte et de l’absence de jeton CSRF.
- Annulation motivée, audit sans texte de transmission, désactivation avec révocation des sessions.
- Redémarrage et persistance, serveur arrêté inaccessible, sauvegarde SQLite et restauration du fichier avec sessions supprimées.

`tests/private-browser.mjs` lance un serveur et une base temporaires avec des mots de passe aléatoires. Il exécute le parcours historique `tests/browser.mjs` après connexion, puis vérifie trois contextes navigateur indépendants, la synchronisation périodique, les droits visibles, le suivi Titan par le secrétariat, le journal, une largeur mobile et une panne réseau sans faux message de succès ni perte du texte du formulaire.

Ces essais sont exécutés dans Chromium sur Linux. Ils ne constituent **pas** un test réel Windows, Safari iPhone, 5G, Tailscale, extinction Windows ou démarrage automatique. Les scripts PowerShell, le parcours de création du premier compte dans un terminal Windows et les règles Tailscale doivent encore être validés sur les équipements cibles. Aucun abonnement, appareil distant ou déploiement privé réel n’est configuré par les tests.
