/**
 * Base de données légère via fichier JSON
 * Stocke : préférences de réservation, historique, compte utilisateur
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data.json');

const DEFAULT_DB = {
  user: null,
  preferences: [],  // Créneaux préférés à réserver automatiquement
  bookings: [],     // Historique des réservations
  nextRun: null,    // Prochain passage du scheduler
};

function load() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Erreur lecture DB:', e.message);
  }
  return { ...DEFAULT_DB };
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

export function getDB() {
  return load();
}

export function saveDB(data) {
  save(data);
}

export function getUser() {
  return load().user;
}

export function setUser(user) {
  const db = load();
  db.user = user;
  save(db);
}

export function getPreferences() {
  return load().preferences;
}

export function addPreference(pref) {
  const db = load();
  pref.id = Date.now().toString();
  pref.active = true;
  pref.createdAt = new Date().toISOString();
  db.preferences.push(pref);
  save(db);
  return pref;
}

export function updatePreference(id, updates) {
  const db = load();
  const idx = db.preferences.findIndex(p => p.id === id);
  if (idx === -1) return null;
  db.preferences[idx] = { ...db.preferences[idx], ...updates };
  save(db);
  return db.preferences[idx];
}

export function deletePreference(id) {
  const db = load();
  db.preferences = db.preferences.filter(p => p.id !== id);
  save(db);
}

export function getBookings() {
  return load().bookings;
}

export function addBooking(booking) {
  const db = load();
  booking.id = Date.now().toString();
  booking.createdAt = new Date().toISOString();
  db.bookings.unshift(booking);
  // Garder max 100 réservations
  if (db.bookings.length > 100) db.bookings = db.bookings.slice(0, 100);
  save(db);
  return booking;
}

export function setNextRun(date) {
  const db = load();
  db.nextRun = date;
  save(db);
}

export function getNextRun() {
  return load().nextRun;
}
