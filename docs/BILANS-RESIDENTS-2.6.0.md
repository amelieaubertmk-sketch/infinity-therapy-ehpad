# Bilans résidents 2.6.0 — formulaire compact, corbeille et suivi Titan

Cette version fait évoluer uniquement les bilans. Les transmissions, leurs statuts, les résidents, les modèles, les comptes, les ports, Tailscale et les scripts de démarrage ne sont pas réinitialisés ou reconfigurés. Les modifications du fichier principal de l’interface concernent seulement le numéro de version et le chargement du module Bilans.

## Nouveau formulaire

Les nouveaux bilans utilisent un format structuré `clinical.schema = 2`. Les anciens bilans et brouillons gardent leur format : aucune conversion automatique des valeurs ni suppression des anciens champs. Ils restent consultables dans une vue de compatibilité, avec les anciennes données cliniques, articulaires et les constats conservés. Une réévaluation peut être créée dans le nouveau format depuis un ancien bilan finalisé.

Ordre du formulaire :

1. Anamnèse : motif et observations facultatives.
2. Examen : 2.1 MRC ; 2.2 Marche ; 2.3 TUG ; 2.4 Tinetti ; 2.5 cinq levers ; 2.6 bilan articulaire facultatif ; 2.7 deux transferts ; 2.8 constats.
3. Diagnostic kinésithérapique modifiable.
4. Projet thérapeutique modifiable et échéance.

Les cases Observations et Bilan articulaire sont décochées à la création. Les désactiver masque la zone et l’exclut du rapport et des nouvelles propositions, mais **conserve le texte** dans le brouillon. Les réactiver retrouve ce texte. Les anciens diagnostics médicaux, douleurs, chutes, situation antérieure et précautions ne sont plus des champs du nouveau formulaire ; leurs données historiques ne sont pas effacées.

### MRC

La rubrique reste visible. Aucun choix de réalisabilité ni aucune cotation ne sont présélectionnés. Réalisable affiche les tableaux droite/gauche dans l’ordre demandé : traction, poussée, préhension ; puis flexion de hanche, flexion de genou, extension de genou, releveurs, flexion plantaire.

Chaque cellule distingue vide, 0/5, 1/5, 2/5, 3/5, 4/5, 5/5 et NE. Un motif facultatif de NE est propre à chaque cellule. Un testing global non réalisable affiche un motif prédéfini ; seul le choix Autre motif nécessite une précision. Les valeurs masquées ne sont pas effacées ni utilisées comme des résultats actifs. Une difficulté de consigne n’est jamais transformée en diagnostic cognitif. Les mouvements fonctionnels des membres supérieurs ne constituent pas automatiquement un MRC strictement standardisé d’un muscle isolé.

### Marche et tests

Marche et fauteuil roulant n’ont pas de réponse arbitraire à la création. Les aides sont proposées dans l’ordre alphabétique, avec sélection multiple. Le fauteuil habituel est indépendant de la marche possible. Une distance absente ne devient pas zéro.

Les aides habituelles sont proposées pour le TUG et le Tinetti. L’option Modifier les aides conserve séparément les conditions réelles du test. Une marche impossible neutralise le TUG, son temps et les items de marche du Tinetti dans les résultats actifs, les propositions et le PDF. Les anciennes réponses du brouillon sont conservées si la situation est réactivée, sans constituer des mesures actuelles lorsqu’elles sont masquées.

Le Tinetti suit une seule grille POMA 28 : équilibre 16 et marche 12 ; les deux sous-items de rotation 360° sont distincts. Les choix portent sur les observations, pas sur une saisie directe du total. Une valeur vide ou NE n’est pas cotée zéro. Si un sous-score n’est pas complet ou si la marche est impossible, aucun total standardisé /28 n’est présenté. Les détails sont conservés dans SQLite ; le PDF présente les scores de synthèse et le caractère partiel, pas les vingt réponses brutes.

Le TUG et le 5xSTS montrent le temps réellement mesuré, le protocole et les aides/bras. Ils ne reçoivent **aucun seuil catégorique généralisé à tous les résidents d’EHPAD**, faute de référence individuelle pertinente. Une passation adaptée est explicitement signalée. Le test de 30 secondes n’est pas dans le nouveau formulaire ; ses anciennes mesures restent conservées dans les documents historiques.

Les transferts ne comprennent que lit-fauteuil et assis-debout, avec une réponse par ligne et un bouton Effacer. Une absence de réponse n’est pas une assistance totale. Les constats comprennent les difficultés de compréhension ou d’exécution des consignes ; aucun commentaire justificatif libre n’est imposé dans le nouveau formulaire.

### Références cliniques et limites

- Tinetti ME. Performance-oriented assessment of mobility problems in elderly patients. J Am Geriatr Soc. 1986;34:119–126. Grille POMA 28 : observation assise, lever, tentatives, équilibre immédiat/debout, poussées, yeux fermés, rotation et retour assis ; initiation, pas droite/gauche, symétrie, continuité, trajectoire, tronc et écartement.
- Repères conventionnels de dépistage POMA 28 : moins de 19, élevé ; 19–24, intermédiaire ; 25–28, faible dans cette grille. Ils ne constituent pas une prédiction individuelle ni une validation spécifique à tout résident d’EHPAD. La classification n’est présentée que pour une cotation complète et un protocole déclaré standard. Une aide humaine ou une adaptation doit être appréciée cliniquement et le protocole déclaré en conséquence.
- Podsiadlo D, Richardson S. The Timed Up & Go. J Am Geriatr Soc. 1991;39:142–148. Trajet de 3 mètres, lever, demi-tour, retour assis ; conditions réelles à conserver.
- Bohannon RW. Reference values for the five-repetition sit-to-stand test. Percept Mot Skills. 2006;103:215–222. Les normes publiées ne sont pas appliquées automatiquement à une population institutionnalisée ou à un protocole modifié.

Ces références documentent les règles locales ; elles ne sont pas des services appelés par l’application. Le praticien reste responsable de la bonne exécution des protocoles, de la validité des cotations et de leur interprétation. Le logiciel ne certifie pas une évaluation clinique et n’établit pas de diagnostic médical à partir d’un score.

## Génération et validation

**Générer le diagnostic et le projet** produit deux propositions locales déterministes à partir des seules réponses actives. Les absences et NE ne créent pas de déficit. Les transferts, aides, observations et limites articulaires actives alimentent les propositions. Aucun service externe ni IA distante n’est utilisé.

Une mention explicite de contre-indication ou d’interdiction dans les textes actifs bloque les interventions automatiques et demande un projet manuel. Cette détection lexicale conservative n’est pas une compréhension médicale du texte : des formulations inhabituelles peuvent ne pas être reconnues et une mention négative peut imposer une vérification manuelle. Le praticien doit vérifier toutes les précautions applicables.

La génération ne finalise rien. Si des textes existent, une confirmation précède leur remplacement. La version reçue avant régénération, les propositions générées et les textes corrigés/enregistrés sont conservés dans les versions médicales du bilan, séparément du journal technique. Tout changement signale la nécessité de relire ; aucun texte corrigé n’est réécrit automatiquement pendant la saisie.

**Enregistrer le brouillon** conserve la saisie sur le serveur. Il n’existe pas de sauvegarde médicale dans le stockage du navigateur, ni de file d’envoi hors connexion. Ne pas quitter avant une sauvegarde confirmée. Le numéro de révision refuse les écrasements concurrents.

**Valider le bilan** nécessite la case de relecture professionnelle puis une confirmation. Les données essentielles sont vérifiées, les champs facultatifs ne deviennent pas obligatoires et aucun rythme/durée de traitement n’est inventé. Le bilan finalisé et les dates/auteurs de validation sont conservés et immuables. La fréquence et la durée ne sont pas des champs du nouveau formulaire. L’échéance est Dans 3 mois par défaut, Dans 6 mois ou Selon l’évolution clinique ; ce dernier choix ne génère aucune date arbitraire.

Les anciens brouillons continuent à être contrôlés dans leur format historique : leurs anciens champs restent consultables, sans être supprimés ou convertis implicitement.

## Supprimer et restaurer un brouillon

**Supprimer le brouillon** n’apparaît que pour un brouillon appartenant au kiné connecté ou accessible à l’administratrice. La confirmation est « Voulez-vous vraiment supprimer ce brouillon de bilan ? ». Annuler ne fait aucune requête de suppression.

La suppression est logique : le document quitte la liste active et va dans **Corbeille des brouillons**. **Restaurer le brouillon** rétablit la dernière version enregistrée. Les modifications non enregistrées ne sont pas ajoutées automatiquement à cette version. Aucune purge définitive automatique n’est introduite.

Le serveur refuse cette action pour un bilan finalisé et pour les utilisateurs non autorisés. Le résident, ses transmissions et ses autres bilans ne sont jamais effacés par cette action. Suppression et restauration sont journalisées avec l’utilisateur et la date, sans texte médical dans l’audit.

## Bilans à saisir sur Titan

Un bilan finalisé non confirmé apparaît automatiquement dans **Bilans à saisir sur Titan** : date, code résident, étage/unité, évaluateur, statut, Voir le PDF. Les anciens bilans finalisés sont considérés non confirmés tant qu’aucun utilisateur n’a enregistré de confirmation ; le logiciel ne devine pas ce qui a déjà été importé dans Titan.

**Voir le PDF** montre d’abord le résident et le bilan dans l’application. Après confirmation, le document exact est téléchargé et un lien permet son ouverture. Le serveur vérifie la confirmation du résident ; l’interface vérifie l’identifiant interne du bilan reçu, sans placer cet identifiant dans le PDF. Une ligne ne dépend pas du bilan actuellement ouvert dans le formulaire.

La consultation ne modifie aucun statut Titan. Après intégration manuelle, **Marquer comme saisi sur Titan** demande une confirmation distincte. Le bilan quitte les attentes, reste dans **Historique des bilans**, conserve son PDF et affiche la date et le compte de confirmation. Aucun lien automatique avec Titan n’est ajouté.

Les droits sont contrôlés côté serveur : rédaction/validation et brouillons propres pour le kiné ; tous les brouillons pour l’administratrice ; consultation/export des finalisés et confirmation manuelle Titan pour le secrétariat, comme son rôle de suivi des transmissions. Les versions intermédiaires d’un brouillon ne deviennent pas visibles à un autre utilisateur simplement parce que le document a ensuite été finalisé ; seuls le propriétaire/l’administratrice les consultent toutes.

## Confidentialité du PDF

Les nouveaux exports, y compris ceux d’anciens bilans, ne reprennent aucun identifiant patient dans l’en-tête, le pied de page, les métadonnées ou le nom de fichier. Pas de résident, code, initiales, nom/prénom, étage/unité, identifiant de résident ou de bilan. Le fichier se nomme `Bilan_Kinesitherapique_AAAA-MM-JJ.pdf`.

L’association interne au résident reste conservée dans SQLite et visible dans l’application. Les identifiants connus éventuellement recopiés textuellement dans les contenus sont retirés à l’export ; les données originales du bilan ne sont pas effacées. Les rubriques facultatives désactivées sont exclues, avec suppression de leur texte exact s’il se retrouve dans une proposition antérieure.

**L’absence d’identifiant ne garantit pas une anonymisation complète.** Le texte libre peut encore contenir des éléments identifiants inconnus ou indirects. La confirmation avant export rappelle cette limite ; le praticien doit relire le PDF avant import. Les anciens PDF déjà téléchargés ou copiés hors de l’application ne sont ni effacés ni anonymisés rétroactivement.

Le premier export finalisé est conservé dans SQLite, avec le lien interne au bon bilan ; les exports suivants et l’historique retrouvent ce document. Le marquage Titan ne modifie pas ce PDF. Les tables de documents, de versions et de suivi sont incluses dans les sauvegardes SQLite complètes.

PDF local A4, polices embarquées, titres bleu nuit, tableaux MRC séparés droite/gauche, tableaux non vides, synthèse Tinetti, paragraphes courts conservés ensemble, pagination et pied de page neutre. Un caractère non pris en charge bloque l’export au lieu de remplacer silencieusement une donnée.

La base et les exports ne sont pas chiffrés par l’application. Les protections Windows, du disque, des sauvegardes et de l’accès HTTPS privé restent nécessaires. Tailscale ne constitue pas à lui seul une certification réglementaire. Les limites de sécurité existantes restent applicables ; aucune conformité pour des données de santé réelles n’est certifiée par cette évolution.
