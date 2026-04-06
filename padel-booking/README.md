# 🎾 Cap 7 Padel — Réservation Automatique (iPhone)

Application iPhone (PWA) pour réserver automatiquement des créneaux sur **Cap 7 Padel** via la plateforme **Anybuddy**.

## Architecture

```
padel-booking/
├── backend/          Node.js + Express + Playwright
│   ├── server.js     API REST + SSE temps réel
│   ├── automator.js  Automatisation navigateur (Playwright)
│   ├── scheduler.js  Tâches planifiées (node-cron)
│   └── db.js         Stockage JSON local
└── frontend/         React PWA (installable iPhone)
    └── src/pages/
        ├── Dashboard.jsx    Accueil + lancement manuel
        ├── Preferences.jsx  Gestion des créneaux
        ├── Bookings.jsx     Historique
        └── Account.jsx      Identifiants Anybuddy
```

## Installation rapide

### 1. Backend

```bash
cd backend
npm install
npx playwright install chromium

# Configuration
cp .env.example .env
# Éditez .env avec vos identifiants Anybuddy

npm start
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev    # Développement
npm run build  # Production
```

### 3. Installer sur iPhone

1. Ouvrez Safari et naviguez vers `http://[IP_DU_SERVEUR]:5173`
2. Appuyez sur le bouton **Partager** (carré avec flèche)
3. Sélectionnez **"Sur l'écran d'accueil"**
4. Nommez l'app **"Cap7 Padel"** et tapez **Ajouter**

L'application apparaît comme une vraie app sur votre écran d'accueil !

## Utilisation

### Configuration initiale
1. Ouvrez l'app → onglet **Compte**
2. Entrez vos identifiants **Anybuddy** (anybuddyapp.com)
3. Choisissez la fréquence de réservation automatique

### Ajouter des créneaux
1. Onglet **Créneaux** → **+ Nouveau créneau**
2. Choisissez : jour · heure · durée · jours à l'avance
3. Activez/désactivez les créneaux avec le toggle

### Réservation automatique
- L'app tente de réserver **automatiquement** selon la planification
- Vous pouvez aussi déclencher manuellement depuis l'onglet **Accueil**
- L'historique est visible dans l'onglet **Historique**

## Comment ça fonctionne

1. Le serveur Node.js tourne en arrière-plan
2. À l'heure configurée (défaut 8h00), Playwright ouvre un navigateur invisible
3. Il se connecte à Anybuddy avec vos identifiants
4. Il navigue vers la page Cap 7 Padel et sélectionne le créneau
5. Il confirme la réservation automatiquement
6. Le résultat est affiché dans l'app iPhone en temps réel

## Production (sur un serveur/Raspberry Pi)

```bash
npm install -g pm2

# Backend
cd backend
pm2 start server.js --name cap7-padel-backend

# Frontend (build statique servi par le backend ou Nginx)
cd frontend
npm run build
# Copier dist/ dans un dossier servi par Nginx ou Express
```

## Dépendances clés

| Outil | Rôle |
|-------|------|
| Playwright | Automatisation navigateur (réservation) |
| node-cron | Planification des tâches |
| Express | API REST |
| React + Vite | Interface iPhone |
| vite-plugin-pwa | Installation sur écran d'accueil |
