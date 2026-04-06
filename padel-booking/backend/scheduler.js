/**
 * Planificateur de réservations automatiques
 * Tourne en arrière-plan et réserve selon les préférences
 */
import cron from 'node-cron';
import { getPreferences, getUser, setNextRun } from './db.js';
import { runAllBookings } from './automator.js';

let currentTask = null;

/**
 * Calcule la prochaine exécution à 21h30 le lendemain
 */
function computeNextRun() {
  const next = new Date();
  // Si on est déjà après 21h30, c'est demain soir
  if (next.getHours() > 21 || (next.getHours() === 21 && next.getMinutes() >= 30)) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(21, 30, 0, 0);
  return next.toISOString();
}

/**
 * Lance une tentative de réservation manuelle ou planifiée
 */
export async function runNow(emitter) {
  const user = getUser();
  const prefs = getPreferences();

  if (!user) {
    console.log('[Scheduler] Pas de compte configuré.');
    return { error: 'Aucun compte configuré.' };
  }
  if (prefs.length === 0) {
    console.log('[Scheduler] Aucune préférence configurée.');
    return { error: 'Aucune préférence de réservation.' };
  }

  console.log('[Scheduler] Démarrage des réservations...');
  if (emitter) emitter.emit('booking_start', { count: prefs.length });

  try {
    const results = await runAllBookings(prefs, user.email, user.password);
    if (emitter) emitter.emit('booking_done', results);
    return results;
  } catch (err) {
    if (emitter) emitter.emit('booking_error', { error: err.message });
    return { error: err.message };
  }
}

/**
 * Démarre le planificateur automatique
 * Par défaut : tous les soirs à 21h30 (ouverture des réservations J+8 sur Cap 7 Padel)
 */
export function startScheduler(cronExpression = '30 21 * * *', emitter = null) {
  if (currentTask) {
    currentTask.stop();
  }

  console.log(`[Scheduler] Démarrage avec cron: "${cronExpression}"`);
  setNextRun(computeNextRun());

  currentTask = cron.schedule(cronExpression, async () => {
    console.log('[Scheduler] Déclenchement automatique 21h30 → réservation J+8');
    await runNow(emitter);
    setNextRun(computeNextRun());
  }, { timezone: 'Europe/Paris' });

  return currentTask;
}

export function stopScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
}
