# Installation iPhone — Cap 7 Padel Automatique

## Ce dont vous avez besoin
- iPhone avec iOS 14 ou plus
- **Scriptable** (App Store, gratuit)
- L'app **Raccourcis** (déjà installée sur iPhone)
- Un compte sur **anybuddyapp.com** (gratuit, lié à Cap 7 Padel)

---

## Étape 1 — Créer un compte Anybuddy (5 min)

1. Allez sur **anybuddyapp.com** ou installez l'app Anybuddy
2. Créez un compte avec votre email
3. Recherchez "Cap 7 Padel" et liez votre compte
4. Notez votre **email** et **mot de passe**

---

## Étape 2 — Installer Scriptable

1. App Store → cherchez **"Scriptable"**
2. Installez l'app (gratuit, par Simon Støvring)

---

## Étape 3 — Copier le script

1. Ouvrez le fichier `cap7-padel-booking.js`
2. Modifiez les 3 lignes en haut :
   ```
   EMAIL     = "votre@email.com"
   PASSWORD  = "votre_mot_de_passe"
   TIME_SLOT = "10:00"   ← l'heure de votre créneau habituel
   ```
3. Copiez tout le texte du fichier
4. Ouvrez **Scriptable** sur iPhone
5. Tapez **+** en haut à droite
6. Collez le code
7. Nommez le script : **Cap7 Padel**
8. Tapez le bouton ▶ pour tester (doit demander l'heure correcte)

---

## Étape 4 — Automatisation à 21h30

1. Ouvrez **Raccourcis** sur iPhone
2. Onglet **Automatisation** (en bas)
3. **+** → **Créer une automatisation personnelle**
4. **Heure du jour** → tapez **21:30**
5. Répéter : **Tous les jours**
6. **Suivant** → **Ajouter une action**
7. Cherchez **"Scriptable"** → **Exécuter le script**
8. Sélectionnez : **Cap7 Padel**
9. **Suivant** → **Désactivez "Confirmer avant d'exécuter"** ← IMPORTANT
10. **OK**

---

## Résultat

Chaque soir à **21h30**, votre iPhone exécutera automatiquement le script.

Vous recevrez une notification :
- ✅ **"Réservé ! Mardi 14 avril à 10h00"** si ça marche
- ❌ **"Créneau indisponible"** si le créneau est pris (avec les heures dispo)

---

## Dépannage

**Le créneau n'est pas trouvé :**
Vérifiez que TIME_SLOT correspond exactement à l'heure affichée dans l'app
(essayez "10:00" ou "10h00" selon le format Anybuddy)

**Erreur de connexion :**
Vérifiez email/mot de passe sur anybuddyapp.com depuis Safari

**Le script ne se lance pas à 21h30 :**
Vérifiez que "Confirmer avant d'exécuter" est bien désactivé dans Raccourcis
