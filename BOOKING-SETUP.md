# EdenDrive — réservation et espace chauffeur

Le site existant reste intact. Les nouvelles interfaces sont accessibles à `/reservation-eden/` et `/espace-chauffeur/`. Ajouter `?demo=1` pour essayer uniquement des données fictives, conservées dans la session du navigateur. Aucun envoi ni paiement réel en démonstration. Les PDF de démonstration passent par Imprimer / enregistrer en PDF.

## Fonctionnement implémenté
- Demande client enregistrée en PostgreSQL, lien privé aléatoire, aucune confirmation automatique ni prix fourni par le client.
- Espace chauffeur protégé par mot de passe haché scrypt, session HttpOnly 12 heures, contrôle d’origine, limite de tentatives persistante.
- Confirmation du tarif, annulation des demandes non payées/non engagées, changement de chauffeur, fin de course, enregistrement explicite des règlements reçus.
- Bon PDF réservé aux courses confirmées, facture après fin de course. Numéro attribué dans une transaction avec compteur verrouillé, document figé, réémission idempotente. Paiement indépendant de l’émission de facture.
- Paiement intégral via SumUp Hosted Checkout : montant confirmé du serveur, accès client privé, référence unique, récupération du checkout existant, vérification serveur de statut/montant/devise/marchand/référence avant de marquer payé.
- Retour SumUp retrouve la réservation en sessionStorage, vérifie le paiement. Sinon le client utilise son lien privé. La fermeture du navigateur n’est pas considérée comme un paiement. Vérification aussi disponible côté chauffeur.
- Aucun email/SMS automatique dans cette V1. Le client conserve son lien; le chauffeur peut générer et copier un nouveau lien privé pour l’envoyer. La génération révoque l’ancien lien. Ne pas annoncer un email envoyé.
- Pas de cartographie ni de calcul routier automatique : prix validé manuellement par le chauffeur; les adresses sont saisies intégralement.

## Activation (nécessite le compte Vercel du propriétaire)
1. Créer une base PostgreSQL (ex. Neon) et utiliser sa connexion chiffrée/poolée dans `DATABASE_URL`. Ne jamais exposer cette variable dans le navigateur ou GitHub. Prévoir sauvegardes et rétention.
2. Appliquer `server/schema.sql` via la console SQL de la base ou `npm run migrate` avec `DATABASE_URL` dans l’environnement. Si l’entreprise facture déjà, initialiser le compteur avec une série distincte validée par le comptable avant toute émission.
3. Choisir un mot de passe de 16 caractères minimum. Le passer par stdin à `npm run admin-password --silent` pour obtenir `ADMIN_PASSWORD_HASH`; ne pas commiter le mot de passe. Rotation du hash : supprimer aussi les sessions existantes dans `eden_sessions` pour une révocation immédiate.
4. Renseigner `APP_ORIGIN=https://www.edendrive.fr` (origine exacte, sans slash final) et `EDEN_COMPANY_JSON` avec les informations de l’exploitant actuel. Ne pas reprendre celles de Nessyia. Champs : legalName (incluant EI ou forme/capital pour une société), address, siret, registration, phone, email, driverName, driverCard, vehicle, plate, vatMode (`exempt` ou `taxable`), vatRate (nombre), vatNumber et latePaymentTerms pour les clients professionnels. Valider ces informations et le régime TVA avec l’exploitant; ne pas déduire un régime du bon du cousin.
5. Pour SumUp, configurer `SUMUP_API_KEY` et `SUMUP_MERCHANT_CODE` côté serveur uniquement. Utiliser d’abord un compte de test éligible aux paiements en ligne, vérifier création, retour, paiement échoué et paiement réussi. Les remboursements et compléments ne sont pas implémentés.
6. Finaliser les coordonnées du responsable, prestataires et durées de conservation dans la notice de confidentialité. Puis passer `EDEN_BOOKING_ENABLED=true` et redéployer. Tant que les prérequis manquent, les écritures renvoient 503 et les interfaces réelles restent désactivées.
7. Tester une demande autorisée et un paiement de test de bout en bout, vérifier PDF et statut; connecter seulement ensuite les liens de réservation de l’accueil à ce nouveau parcours.

## Vérifications
`npm ci`, `npm test`, `npm run build`. `npm run dev` sert le site et l’API localement après construction. Les tests utilisent PostgreSQL embarqué PGlite avec données fictives; ils ne touchent ni SumUp ni la production.

## Limites de la livraison
Le code d’intégration SumUp est implémenté mais non validé avec le compte réel. La base et les variables ne peuvent pas être configurées via l’accès Vercel actuellement disponible (aucune équipe renvoyée). Notifications, géocodage, acomptes, remboursements, avoirs et facturation électronique via plateforme agréée restent hors V1. Les PDF ne constituent pas une intégration de facturation électronique. Il faut traiter les corrections de factures et remboursements séparément, sans altérer les documents émis.

Sources vérifiées le 19 septembre 2026 :
- https://developer.sumup.com/online-payments/checkouts/hosted-checkout
- https://developer.sumup.com/api/checkouts/create
- https://entreprendre.service-public.gouv.fr/vosdroits/F31808
