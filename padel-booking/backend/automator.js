/**
 * Automatisation de réservation Cap 7 Padel via Anybuddy
 * Utilise Playwright pour contrôler le navigateur
 */
import { chromium } from 'playwright';
import { addBooking } from './db.js';

const ANYBUDDY_LOGIN_URL = 'https://www.anybuddyapp.com/connexion';
const CAP7_URL = 'https://www.anybuddyapp.com/club-cap-7-padel-marseille';

// Jours de la semaine en français
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Formate une date en "YYYY-MM-DD"
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Retourne la prochaine occurrence d'un jour de semaine
 * @param {number} targetDay - 0=dimanche, 1=lundi, ..., 6=samedi
 * @param {number} daysAhead - nombre de jours minimum à l'avance
 */
function getNextDayOfWeek(targetDay, daysAhead = 1) {
  const now = new Date();
  const target = new Date(now);
  target.setDate(now.getDate() + daysAhead);
  while (target.getDay() !== targetDay) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

/**
 * Connecte l'utilisateur sur Anybuddy
 */
async function login(page, email, password) {
  console.log('[Automator] Connexion à Anybuddy...');
  await page.goto(ANYBUDDY_LOGIN_URL, { waitUntil: 'networkidle' });

  // Accepter les cookies si nécessaire
  try {
    const cookieBtn = page.locator('button:has-text("Accepter"), button:has-text("Accept")');
    if (await cookieBtn.isVisible({ timeout: 3000 })) {
      await cookieBtn.click();
    }
  } catch (_) {}

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")');

  await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  console.log('[Automator] Connecté.');
}

/**
 * Réserve un créneau pour une préférence donnée
 * @param {object} preference - { dayOfWeek, time, duration, court }
 * @param {string} email
 * @param {string} password
 * @returns {object} résultat de la tentative
 */
export async function attemptBooking(preference, email, password) {
  const headless = process.env.HEADLESS !== 'false';
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const result = { success: false, message: '', preference, timestamp: new Date().toISOString() };

  try {
    await login(page, email, password);

    // Calculer la date cible
    const targetDate = getNextDayOfWeek(preference.dayOfWeek, preference.daysInAdvance || 1);
    const dateStr = formatDate(targetDate);

    console.log(`[Automator] Recherche créneau ${JOURS[preference.dayOfWeek]} ${dateStr} à ${preference.time}...`);

    // Naviguer vers la page de réservation Cap 7
    await page.goto(`${CAP7_URL}?date=${dateStr}`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    // Chercher les créneaux disponibles
    // Anybuddy affiche les créneaux sous forme de boutons/cartes
    const slotSelectors = [
      `[data-time="${preference.time}"]`,
      `button:has-text("${preference.time}")`,
      `.slot:has-text("${preference.time}")`,
      `[class*="slot"]:has-text("${preference.time}")`,
      `[class*="time"]:has-text("${preference.time}")`,
    ];

    let slotFound = false;
    for (const selector of slotSelectors) {
      try {
        const slot = page.locator(selector).first();
        if (await slot.isVisible({ timeout: 2000 })) {
          await slot.click();
          slotFound = true;
          console.log(`[Automator] Créneau ${preference.time} trouvé et sélectionné.`);
          break;
        }
      } catch (_) {}
    }

    if (!slotFound) {
      result.message = `Aucun créneau disponible le ${JOURS[preference.dayOfWeek]} à ${preference.time}`;
      console.log(`[Automator] ${result.message}`);
    } else {
      // Confirmer la réservation
      await page.waitForTimeout(1500);

      const confirmSelectors = [
        'button:has-text("Réserver")',
        'button:has-text("Confirmer")',
        'button:has-text("Valider")',
        'button[type="submit"]',
      ];

      let confirmed = false;
      for (const sel of confirmSelectors) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 2000 })) {
            await btn.click();
            confirmed = true;
            break;
          }
        } catch (_) {}
      }

      if (confirmed) {
        await page.waitForTimeout(3000);
        result.success = true;
        result.message = `Réservation confirmée : ${JOURS[preference.dayOfWeek]} ${dateStr} à ${preference.time}`;
        console.log(`[Automator] ✅ ${result.message}`);

        addBooking({
          preferenceId: preference.id,
          dayOfWeek: preference.dayOfWeek,
          date: dateStr,
          time: preference.time,
          status: 'confirmée',
          message: result.message,
        });
      } else {
        result.message = 'Impossible de confirmer la réservation (bouton introuvable)';
      }
    }
  } catch (err) {
    result.message = `Erreur : ${err.message}`;
    console.error('[Automator] Erreur:', err.message);

    addBooking({
      preferenceId: preference.id,
      date: new Date().toISOString().split('T')[0],
      time: preference.time,
      status: 'erreur',
      message: result.message,
    });
  } finally {
    await browser.close();
  }

  return result;
}

/**
 * Tente de réserver tous les créneaux actifs
 */
export async function runAllBookings(preferences, email, password) {
  console.log(`[Automator] Lancement de ${preferences.length} tentatives...`);
  const results = [];

  for (const pref of preferences.filter(p => p.active)) {
    const res = await attemptBooking(pref, email, password);
    results.push(res);
    // Petite pause entre les réservations
    await new Promise(r => setTimeout(r, 2000));
  }

  return results;
}
