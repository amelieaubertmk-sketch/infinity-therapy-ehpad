# Suivi administratif des ordonnances

Dans Boss → Résidents & modèles, la colonne Ordonnance donne accès à « Modifier l’ordonnance ». Trois situations distinctes sont possibles :

- Non renseigné : valeur par défaut des résidents existants, sans supposer que l’ordonnance est manquante.
- Pas d’ordo : case à cocher ; aucune date n’est conservée comme ordonnance disponible.
- Ordonnance disponible : date obligatoire. Choisir cette situation décoche Pas d’ordo.

Une date donne un rappel indicatif à 12 mois calendaires (29 février → 28 février de l’année suivante). Le rappel devient visuellement proche dans les 30 jours précédents, puis dépassé après la date. Ce suivi est uniquement administratif : il ne constitue aucune vérification juridique, expiration légale automatique ou déclaration d’invalidité. Une date ancienne ne bloque pas le pointage.

Dans les listes de transmissions, le code est rouge et l’indicateur « Ordonnance manquante » apparaît si le résident est actuellement marqué Pas d’ordo. Dans l’historique, Pointer sur Topaze est masqué et Voir le suivi reste accessible. Le serveur refuse aussi le pointage si le statut a changé depuis l’affichage du navigateur. Non renseigné donne l’indicateur distinct « Ordonnance à vérifier » sans blocage automatique. Une ordonnance datée ne donne aucune alerte Pas d’ordo.

Le pointage Topaze reste une confirmation manuelle que l’acte a été vérifié et saisi pour la facturation ; l’application n’atteste pas cette vérification à votre place.

## Données et mise à jour

La propriété facultative `prescription` est stockée uniquement sur le résident, dans le JSON déjà présent en SQLite : `{status:'unknown'}`, `{status:'missing'}` ou `{status:'dated',date:'AAAA-MM-JJ'}`. Les transmissions consultent le statut actuel du résident : aucune copie de ce statut dans leur historique et aucune réécriture des anciennes transmissions. Quand le résident passe à Pas d’ordo, ses pointages actifs sont annulés uniquement dans Infinity Therapy, dans la même transaction que la modification du résident. La trace administrative conserve le pointage initial, la date, l’auteur et le motif de son annulation interne. Le statut affiché devient Saisi sur Titan ; le code reste rouge et Voir le suivi reste accessible. Les données cliniques et le statut Titan stocké ne sont pas modifiés. Une ordonnance ajoutée ensuite ne restaure aucun ancien pointage : un nouveau clic puis une confirmation explicite sont requis.

Un signalement demande de vérifier et corriger manuellement la situation dans le logiciel de facturation. Infinity Therapy ne réalise et ne prétend réaliser aucune annulation dans Topaze. Le serveur renvoie « Pointage impossible : ordonnance manquante » si une demande concurrente tente de pointer sans ordonnance.

Au démarrage, les anciens enregistrements incompatibles (pointage actif et résident Pas d’ordo) sont corrigés une seule fois, après une sauvegarde SQLite cohérente `before-topaze-correction-*.sqlite` dans le répertoire de données configuré. Si la sauvegarde échoue, le démarrage échoue sans effectuer cette correction. Le fichier contient des données confidentielles et doit être conservé sur un support protégé. La trace d’annulation est également conservée après redémarrage, mise en corbeille/restauration et conversion en suivi Titan.

Aucune migration de schéma ni réinitialisation de SQLite n’est nécessaire. Avant toute installation manuelle, sauvegarder la base avec le script SQLite existant, ainsi que le code et config.json, en conservant le répertoire de données configuré. Avant toute migration future, vérifier l’intégrité de cette sauvegarde. Ne supprimer ni les données ni la configuration ; ne pas relancer la configuration Windows ou modifier Tailscale. Aucun déploiement automatique n’est réalisé.

Les sources et tests du module Bilans sont inchangés. Seules les empreintes des fichiers communs modifiés sont actualisées dans le manifeste de diagnostic existant.

## Tests fictifs

- `npm test` : inclut les tests des trois états, des dates, des rappels, des permissions existantes, du refus serveur de pointage, du redémarrage et de la conservation des transmissions.
- `PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs node tests/prescriptions-browser.mjs` : édition Boss, case Pas d’ordo, effacement de date, rappel dépassé, rouge et indicateurs, boutons, actualisation, reconnexion et redémarrage.
- `PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs node tests/private-browser.mjs` : non-régression du parcours privé existant.

Toutes ces validations utilisent des données et comptes fictifs temporaires ; elles ne constituent pas une validation sur le PC Windows du cabinet.

Test ciblé des six scénarios de correction : `PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs node tests/topaze-invalidation-browser.mjs`. Les tests API couvrent aussi les demandes concurrentes, la correction des anciennes données, l’intégrité et le contenu de la sauvegarde préalable, et l’absence de correction répétée au démarrage suivant.
