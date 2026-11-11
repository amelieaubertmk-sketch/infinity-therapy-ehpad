# Bilans résidents — version 2.5.0

Les bilans sont indépendants des transmissions et ne créent ni statut Titan ni transmission. Aucune API externe n’est utilisée. Le serveur persistant stocke brouillons et bilans finalisés dans SQLite. La copie complète SQLite inclut les bilans, comptes, audit et corbeille.

## Droits et synchronisation

- Administratrice : consulter tous les bilans et brouillons, rédiger, valider, finaliser, exporter.
- Kinésithérapeute : créer et modifier ses brouillons, valider et finaliser ; consulter les bilans finalisés des résidents et les exporter. Les brouillons d’un autre kiné restent privés, sauf pour l’administratrice.
- Secrétariat : consulter et exporter uniquement les bilans finalisés ; pas de rédaction ni validation.

Ces contrôles sont faits par le serveur avec les sessions et protections CSRF existantes. Une révision propre à chaque bilan refuse les écrasements concurrents. Une actualisation de la liste retrouve les bilans partagés ; elle ne remplace pas un formulaire modifié. Utiliser **Sauvegarder le brouillon** avant de quitter : aucune file hors connexion ni copie médicale dans le stockage du navigateur. Si le serveur est inaccessible, le formulaire conserve la saisie dans l’onglet. Un avertissement accompagne la fermeture d’une page contenant des changements non sauvegardés.

## Bilan initial

1. Choisir un résident existant, la date et Amélie ou Alexandre. Le praticien évaluateur est distinct du compte qui valide.
2. Renseigner l’anamnèse : motif, diagnostics connus/antécédents, chutes, douleur, situation antérieure, précautions et observations. La zone précautions doit être renseignée explicitement après vérification, y compris en l’absence de précaution connue.
3. Renseigner les tests utiles. Chaque test propose Réalisé, Non réalisé, Non réalisable ou Contre-indiqué. Un test non effectué ne comporte pas de score ; expliquer le motif. Les membres supérieurs restent facultatifs cliniquement : indiquer Non réalisé et le motif lorsqu’ils ne sont pas examinés.
4. La marche possède des champs distincts : possible/impossible, périmètre mesuré/estimé, aides technique et humaine, qualité, fatigabilité et fauteuil. Les mesures de périmètre et de vitesse disposent de leurs champs numériques. Le bilan articulaire réalisé possède quatre champs distincts : amplitudes, raideurs, rétractions et limitations fonctionnelles. Les unités, muscles, positions, matériel et adaptations doivent être documentés dans les conditions.
5. Retenir explicitement les constats fonctionnels et documenter leurs éléments justificatifs. Le moteur ne transforme pas un score isolé en diagnostic médical. Il combine les modèles correspondant aux constats documentés et cite les tests effectivement renseignés. Les propositions automatiques sont des textes à relire, pas une expertise autonome.
6. Cliquer sur **Générer le diagnostic** pour rafraîchir la proposition. Une proposition non corrigée peut se préparer automatiquement pendant la saisie ; un texte modifié manuellement n’est pas remplacé sans confirmation. Relire et valider explicitement le diagnostic.
7. Générer le projet après validation du diagnostic, le corriger, confirmer manuellement fréquence, durée et échéance de réévaluation, puis valider explicitement le projet.
8. Sauvegarder puis finaliser après confirmation. La finalisation exige les motifs des tests non effectués, les résultats/conditions des tests réalisés, les modalités et les deux validations. Le document devient immuable. Aucune fonction de suppression des bilans n’est ajoutée.
9. **Prévisualiser / Exporter en PDF** génère le fichier sur le serveur local ; le téléchargement et un lien de prévisualisation sont proposés. Ouvrir le document avant intégration manuelle dans Titan. Un brouillon n’est jamais exportable comme document définitif.

Une modification clinique, de date ou de praticien invalide le diagnostic et le projet précédemment validés. Une correction du diagnostic invalide aussi le projet. Le formulaire indique les validations à reprendre ; le serveur vérifie ces invalidations indépendamment de l’interface. Les dates et comptes des validations sont enregistrés par le serveur. Aucun contenu médical n’est écrit dans l’audit technique.

## Tests standardisés

- MRC : entiers de 0 à 5, côté droit et gauche séparés ; ne jamais utiliser 0 pour signifier « non testé ».
- Tinetti POMA : tous les items de l’équilibre et de la marche doivent être cotés pour un calcul complet. Sommes : équilibre /16, marche /12, total /28. Aucun total pour un test non effectué. La grille affichée donne les items et bornes ; la cotation doit suivre la grille clinique standard de référence, sous la responsabilité du praticien formé.
- TUG : secondes, trajet de 3 m avec lever, demi-tour et retour assis ; préciser les conditions et aides.
- Cinq levers de chaise : secondes ; préciser chaise, bras, aide et adaptations.
- Test de 30 secondes : nombre entier de levers complets ; préciser le protocole et ses adaptations.

Le logiciel contrôle des bornes et des sommes, mais ne certifie ni la bonne exécution du protocole ni la validité psychométrique d’une mesure adaptée. Des conditions différentes rendent les écarts délicats à interpréter. Il n’applique pas de seuil pronostique ou de diagnostic médical automatique.

## Contre-indications et génération

Par sécurité, toute précaution libre autre que les mentions exactes « Aucune », « Aucun », « Néant », ou tout test Contre-indiqué bloque **toutes les interventions proposées automatiquement**. Le moteur demande alors un projet manuel compatible après vérification. Il ne tente pas d’interpréter une contre-indication en langage naturel.

Cette règle est volontairement conservative et ne remplace pas la vérification clinique. Un projet libre reste à relire par le kiné. Les modèles couvrent force, équilibre, marche, périmètre, transferts, déconditionnement, limitations articulaires, douleur et autonomie ; ils proposent des objectifs, interventions adaptées et critères de suivi. Aucun rythme, durée ou échéance n’est décidé automatiquement.

## Réévaluation et comparaison

Depuis un bilan finalisé, **Créer une réévaluation** conserve la référence du précédent et reprend son anamnèse, qui reste modifiable. **Les anciens résultats ne sont pas préremplis comme nouveaux résultats** : les tests de la nouvelle évaluation repartent sans score, afin d’éviter une fausse mesure. Les anciens bilans restent immuables.

Renseigner les nouvelles mesures et l’interprétation clinique de l’évolution : amélioration, stagnation ou dégradation, puis adapter objectifs et projet. Le tableau présente résultats antérieurs, actuels et différences chiffrées (actuel moins antérieur), avec avertissement si les conditions diffèrent. Un test absent ou non effectué est « Non comparable ». Le sens clinique d’un écart n’est pas déduit automatiquement. Une section permet aussi de comparer deux bilans finalisés distincts d’un même résident. La réévaluation exportée inclut la comparaison et l’interprétation saisie.

## PDF et limites

PDF A4 portrait avec sections, tableaux, polices embarquées, validation, pagination et pied de page confidentiel. Les textes et tableaux longs se poursuivent lisiblement sur les pages suivantes, avec en-tête répété. Des tests non effectués partageant le même motif sont regroupés pour éviter des lignes répétitives. Les champs d’anamnèse vides sont omis.

Les polices DejaVu incluses couvrent les caractères français et de nombreux symboles usuels ; un caractère non pris en charge bloque l’export au lieu d’être remplacé silencieusement. Les dates du PDF sont françaises et les horaires de validation indiquent le fuseau de Paris. Les dates sont conservées en ISO dans la base.

La base, les exports Excel et les PDF ne sont pas chiffrés par l’application. Les codes résidents, mesures et PDF restent des données sensibles. Protéger compte Windows, disque, sauvegardes et accès Tailscale. Ne pas déposer les documents dans un service cloud personnel. Cette livraison conserve les limites de sécurité existantes ; elle ne constitue pas une certification de conformité pour des données de santé réelles. Voir SECURITE.md.

Les tests ont été exécutés sur des données fictives dans le cloud Linux. Safari/iPhone physique, Windows et l’intégration réelle dans Titan doivent être vérifiés au cabinet. Aucune intégration automatique à Titan, signature électronique qualifiée ou connexion à un service externe n’est ajoutée.
