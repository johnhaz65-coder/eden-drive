#!/bin/bash
# Démarre le backend et le frontend en développement

echo "🎾 Cap 7 Padel Booking — Démarrage..."

# Backend
echo "→ Démarrage du backend (port 3001)..."
cd backend && npm start &
BACKEND_PID=$!

# Attendre que le backend soit prêt
sleep 2

# Frontend
echo "→ Démarrage du frontend (port 5173)..."
cd ../frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Application démarrée !"
echo "   Backend  : http://localhost:3001"
echo "   Frontend : http://localhost:5173"
echo ""
echo "📱 Pour installer sur iPhone :"
echo "   1. Ouvrez Safari → http://[VOTRE_IP]:5173"
echo "   2. Partager → Sur l'écran d'accueil"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter."

# Attendre l'arrêt
wait $BACKEND_PID $FRONTEND_PID
