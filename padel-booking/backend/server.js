/**
 * Serveur Express — API REST pour l'app iPhone Cap 7 Padel
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';
import {
  getUser, setUser,
  getPreferences, addPreference, updatePreference, deletePreference,
  getBookings, getNextRun,
} from './db.js';
import { startScheduler, stopScheduler, runNow } from './scheduler.js';
import { attemptBooking } from './automator.js';

const app = express();
const PORT = process.env.PORT || 3001;
const emitter = new EventEmitter();

app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────────────────────────
// SSE — Server-Sent Events pour mises à jour temps réel
// ─────────────────────────────────────────────────────────────────────────────
const sseClients = new Set();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sseClients.add(send);
  req.on('close', () => sseClients.delete(send));
});

function broadcast(event, data) {
  sseClients.forEach(send => send(event, data));
}

emitter.on('booking_start', d => broadcast('booking_start', d));
emitter.on('booking_done', d => broadcast('booking_done', d));
emitter.on('booking_error', d => broadcast('booking_error', d));

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Configuration du compte Anybuddy
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/account', (req, res) => {
  const user = getUser();
  if (!user) return res.json({ configured: false });
  res.json({ configured: true, email: user.email });
});

app.post('/api/account', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }
  setUser({ email, password });
  res.json({ success: true, email });
});

app.delete('/api/account', (req, res) => {
  setUser(null);
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRÉFÉRENCES — Créneaux à réserver automatiquement
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structure d'une préférence :
 * {
 *   dayOfWeek: 0-6 (0=dimanche),
 *   time: "10:00",
 *   duration: 90,         // minutes
 *   daysInAdvance: 7,     // combien de jours à l'avance
 *   active: true
 * }
 */
app.get('/api/preferences', (req, res) => {
  res.json(getPreferences());
});

app.post('/api/preferences', (req, res) => {
  const { dayOfWeek, time, duration, daysInAdvance } = req.body;
  if (dayOfWeek === undefined || !time) {
    return res.status(400).json({ error: 'dayOfWeek et time sont requis.' });
  }
  const pref = addPreference({
    dayOfWeek: parseInt(dayOfWeek),
    time,
    duration: parseInt(duration) || 90,
    daysInAdvance: parseInt(daysInAdvance) || 7,
  });
  res.json(pref);
});

app.patch('/api/preferences/:id', (req, res) => {
  const pref = updatePreference(req.params.id, req.body);
  if (!pref) return res.status(404).json({ error: 'Préférence introuvable.' });
  res.json(pref);
});

app.delete('/api/preferences/:id', (req, res) => {
  deletePreference(req.params.id);
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// RÉSERVATIONS — Historique et déclenchement manuel
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/bookings', (req, res) => {
  res.json(getBookings());
});

// Déclencher toutes les réservations maintenant
app.post('/api/bookings/run', async (req, res) => {
  const user = getUser();
  if (!user) return res.status(400).json({ error: 'Configurez d\'abord votre compte.' });

  // Répondre immédiatement, la tâche tourne en arrière-plan
  res.json({ message: 'Réservations lancées en arrière-plan.' });
  runNow(emitter);
});

// Tester un créneau spécifique
app.post('/api/bookings/test', async (req, res) => {
  const user = getUser();
  if (!user) return res.status(400).json({ error: 'Configurez d\'abord votre compte.' });

  const preference = req.body;
  if (!preference.dayOfWeek === undefined || !preference.time) {
    return res.status(400).json({ error: 'dayOfWeek et time requis.' });
  }

  try {
    const result = await attemptBooking(preference, user.email, user.password);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER — Configuration de l'automatisation
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/scheduler', (req, res) => {
  res.json({ nextRun: getNextRun() });
});

app.post('/api/scheduler/start', (req, res) => {
  const { cron = '30 21 * * *' } = req.body;
  startScheduler(cron, emitter);
  res.json({ success: true, cron, nextRun: getNextRun() });
});

app.post('/api/scheduler/stop', (req, res) => {
  stopScheduler();
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// DÉMARRAGE
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎾 Cap 7 Padel Booking API démarrée sur http://localhost:${PORT}`);
  console.log('   Copiez .env.example vers .env et remplissez vos identifiants.\n');

  // Démarrer le planificateur : tous les soirs à 21h30 → réserve J+8
  startScheduler('30 21 * * *', emitter);
});
