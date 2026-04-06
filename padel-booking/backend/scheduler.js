/**
 * Planificateur de réservations automatiques
 * Tourne en arrière-plan et réserve selon les préférences
 */
import cron from 'node-cron';
import { getPreferences, getUser, setNextRun } from './db.js';
import { runAllBookings } from './automator.js';

let currentTask = null;

/**
 * Calcule la prochaine exécution
 */
function computeNextRun(cronExpr) {
  // Estimation simple : +1 jour par défaut
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(8, 0, 0, 0);
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
 * Par défaut : tous les jours à 08:00 (moment d'ouverture des réservations)
 */
export function startScheduler(cronExpression = '0 8 * * *', emitter = null) {
  if (currentTask) {
    currentTask.stop();
  }

  console.log(`[Scheduler] Démarrage avec cron: "${cronExpression}"`);
  setNextRun(computeNextRun(cronExpression));

  currentTask = cron.schedule(cronExpression, async () => {
    console.log('[Scheduler] Déclenchement automatique...');
    await runNow(emitter);
    setNextRun(computeNextRun(cronExpression));
  });

  return currentTask;
}

export function stopScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
}
