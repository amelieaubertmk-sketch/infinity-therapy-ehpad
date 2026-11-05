# Périmètre de sécurité — démonstration fictive uniquement

> **Version 2.2 — suivi Titan :** après confirmation de saisie, le texte et les observations sont effacés de la base active, mais une ligne date/résident/secteur/activité/statut reste consultable dans l’historique. Les anciens contenus déjà marqués saisis sont nettoyés au redémarrage après mise à jour. La suppression définitive d’un résident efface aussi ses lignes de suivi. Les sauvegardes antérieures ne sont pas modifiées. Voir [la règle complète](../README.md#suppression-définitive-et-suivi-après-titan--version-22).


L’auto-hébergement et le VPN ne rendent pas cette application conforme pour traiter des données réelles de santé. Les codes abrégés ne constituent pas une anonymisation. N’importez pas de noms, dossiers, observations ou transmissions réels. Il n’existe aucune migration automatique depuis le navigateur public vers la base du PC.

## Protections développées

- Écoute du serveur sur `127.0.0.1` uniquement ; Tailscale Serve assure le proxy privé HTTPS. Aucun Funnel ni port public n’est requis.
- Contrôle du nom d’hôte configuré (ou loopback du proxy local) et de l’origine exacte autorisée pour les écritures. HTTPS obligatoire pour une origine autre que localhost/127.0.0.1. Aucun CORS ouvert, aucune confiance dans des en-têtes utilisateur pour identifier les comptes.
- Sessions opaques aléatoires de huit heures, jeton conservé haché en base, cookie HttpOnly, SameSite Strict et Secure pour l’origine HTTPS. Déconnexion et révocation des sessions lors des changements de compte.
- Mots de passe hachés avec scrypt et sel aléatoire ; aucun compte ni mot de passe prédéfini. Longueur 12 à 256 caractères. Les réponses API ne retournent jamais le hachage.
- Limitation persistante des tentatives de connexion, bornes de taille des requêtes, du nombre de connexions et du nombre de hachages de connexion simultanés.
- Protection CSRF par origine exacte, JSON et jeton de session pour les écritures authentifiées.
- Autorisations serveur, vérification des données entrantes, requêtes SQLite préparées et échappement HTML de l’affichage.
- Texte clinique historique reconstruit/validé côté serveur, statuts et annulations horodatés par le serveur. La suppression en cascade d’un résident est réservée à l’administratrice ; une confirmation Titan supprime le contenu de son entrée et conserve une ligne de suivi. Une suppression arbitraire de transmissions reste refusée par l’API.
- Contrôle de révision global et transactions SQLite pour empêcher un écrasement silencieux concurrent. Une réponse perdue peut laisser une écriture confirmée en base mais non confirmée dans le navigateur : consulter l’historique avant de réessayer.
- Audit avec compte, date, action et identifiant technique, sans texte de transmission ni mot de passe. L’administratrice consulte les 200 derniers événements. Cet audit sur le même disque n’est pas un journal inviolable : l’administrateur système peut modifier la base.
- Aucun outil d’analyse, police distante, télémétrie applicative ou envoi de transmissions vers un tiers. Tailscale utilise ses propres services de coordination et, selon le réseau, des relais chiffrés ; la base demeure sur le PC.
- Données et sauvegardes exclues du dépôt, droits du dossier Windows restreints par le script, sauvegarde SQLite cohérente et fermeture des sessions à la restauration.

Les données fictives de soins sont partagées avec les trois rôles autorisés sur ce cabinet de démonstration. Le rôle secrétariat ne peut ni créer/annuler une transmission ni modifier les résidents/modèles. Il peut consulter les transmissions et suivre Titan. Cette version n’offre pas un cloisonnement par établissement ou par praticien. Ne l’utilisez pas pour plusieurs cabinets sans une nouvelle conception des droits.

## Contrôles sur le PC et les iPhones avant de valider la démonstration

- Confirmer qu’aucun port n’est redirigé sur la box et que `tailscale serve status` montre uniquement Serve privé.
- Tester les règles d’accès : un appareil non autorisé ne doit pas ouvrir la page. Aucun partage public ou Funnel.
- Tester séparément les trois comptes et une désactivation de compte ; un compte secrétariat ne doit pas ouvrir Boss ou créer une séance.
- Vérifier le HTTPS sans exception de certificat, le VPN en 5G et le renouvellement des certificats géré par Tailscale.
- Tester un redémarrage et une extinction Windows, l’absence de session Windows ouverte, une perte réseau et une réponse d’enregistrement incertaine.
- Tester une sauvegarde et une restauration réelles sur un environnement fictif séparé.
- Protéger les appareils avec verrouillage et chiffrement. Activer le chiffrement Windows disponible (BitLocker ou chiffrement de l’appareil), protéger les sauvegardes et le compte administrateur.
- Vérifier les droits NTFS du dossier de données et l’absence de synchronisation OneDrive, de commit Git ou de sauvegarde non maîtrisée vers le cloud.
- Maintenir Windows, Node.js, Tailscale et Safari à jour. Définir une personne responsable des comptes, sauvegardes et incidents.

## Avant toute éventuelle utilisation réelle : nouveau projet de validation obligatoire

1. Établir les responsabilités du cabinet et de l’EHPAD, les finalités, bases légales et les obligations de confidentialité et d’information avec les personnes compétentes (DPO/conseil juridique).
2. Déterminer les obligations HDS et d’hébergement applicables au montage exact ; un PC au cabinet, Tailscale ou un disque chiffré ne prouvent pas leur respect.
3. Formaliser le registre de traitement, les durées de conservation, les droits des personnes, les contrats de sous-traitance et l’analyse de risques/AIPD lorsque requise.
4. Faire réaliser une revue de sécurité indépendante et des tests d’intrusion : authentification, MFA applicative éventuelle, sessions, droits fins, audit protégé, chiffrement, récupération et protection des endpoints.
5. Définir les règles métier de correction et d’annulation, la responsabilité clinique et le contrôle du transfert manuel vers Titan. Faire valider les usages par les professionnels.
6. Établir des sauvegardes chiffrées hors machine, une procédure de reprise testée, une supervision, une politique d’incidents et un plan de continuité (PC indisponible, panne d’électricité, perte d’un téléphone).
7. Créer un environnement de production réellement séparé, avec ses propres comptes, clés, stockage et procédures ; aucune réutilisation aveugle de la base ou des mots de passe fictifs.

Aucune de ces validations organisationnelles, juridiques ou de conformité n’est acquise par la présente implémentation.
