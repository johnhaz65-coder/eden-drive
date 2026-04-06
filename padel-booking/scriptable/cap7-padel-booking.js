// ╔══════════════════════════════════════════════════╗
// ║   Cap 7 Padel — Réservation Automatique          ║
// ║   Script Scriptable pour iPhone                  ║
// ║   Déclenché par Raccourcis à 21h30 chaque soir   ║
// ╚══════════════════════════════════════════════════╝
//
// INSTALLATION :
//   1. Installez "Scriptable" sur l'App Store (gratuit)
//   2. Copiez ce script dans Scriptable
//   3. Remplissez EMAIL, PASSWORD et TIME_SLOT ci-dessous
//   4. Dans Raccourcis > Automatisation > Nouvelle automatisation :
//      Heure du jour → 21h30 → Exécuter script Scriptable → ce script
//      Désactivez "Confirmer avant d'exécuter"

// ═══════════════════════════════════════════════════
//                   CONFIGURATION
// ═══════════════════════════════════════════════════
const EMAIL     = "votre@email.com";     // ← Votre email Anybuddy / Cap7
const PASSWORD  = "votre_mot_de_passe"; // ← Votre mot de passe
const TIME_SLOT = "10:00";              // ← Heure du créneau (ex: "10:00", "19:30")
// ═══════════════════════════════════════════════════

const JOURS = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];
const MOIS  = ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'];

// Date cible : aujourd'hui + 8 jours
function targetDate() {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  return d;
}

function formatISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
}

function formatFR(d) {
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

const cible  = targetDate();
const dateISO = formatISO(cible);
const dateFR  = formatFR(cible);

// ── Notification helper ──────────────────────────────────────────────────────
async function notifier(titre, corps, ok = true) {
  const n = new Notification();
  n.title = titre;
  n.body  = corps;
  if (!ok) n.sound = "failure";
  await n.schedule();
}

// ── Log dans la console Scriptable ──────────────────────────────────────────
function log(msg) {
  console.log(`[Cap7] ${msg}`);
}

log(`Démarrage — cible : ${dateFR} (J+8)`);

// ── WebView silencieuse ──────────────────────────────────────────────────────
const wv = new WebView();

// Utilitaire : attendre N millisecondes
function attendre(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Utilitaire : injecter JS dans la WebView et attendre
async function inject(js, usePromise = false) {
  return await wv.evaluateJavaScript(js, usePromise);
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — Connexion
// ─────────────────────────────────────────────────────────────────────────────
log("Étape 1 : Connexion...");
await wv.loadURL("https://www.anybuddyapp.com/connexion");
await attendre(3000);

const loginResult = await inject(`
  new Promise(resolve => {
    const email = document.querySelector(
      'input[type="email"], input[name="email"], input[autocomplete="email"]'
    );
    const pass = document.querySelector(
      'input[type="password"], input[name="password"]'
    );

    if (!email || !pass) {
      resolve("no_form");
      return;
    }

    // Remplir les champs (compatible React/Vue)
    function fillInput(el, val) {
      const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSet.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    fillInput(email, "${EMAIL}");
    fillInput(pass,  "${PASSWORD}");

    setTimeout(() => {
      const btn = document.querySelector(
        'button[type="submit"], form button, button:last-of-type'
      );
      if (btn) { btn.click(); resolve("submitted"); }
      else { resolve("no_submit_btn"); }
    }, 800);
  })
`, true);

log(`Login : ${loginResult}`);

if (loginResult === "no_form") {
  await notifier("🎾 Cap 7 Padel — Erreur", "Page de connexion introuvable.", false);
  Script.complete();
  return;
}

// Attendre la redirection après login
await attendre(5000);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — Naviguer vers Cap 7 Padel à la date cible
// ─────────────────────────────────────────────────────────────────────────────
log(`Étape 2 : Navigation Cap 7 — ${dateFR} (${dateISO})`);
await wv.loadURL(`https://www.anybuddyapp.com/club-cap-7-padel-marseille?date=${dateISO}`);
await attendre(4000);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 3 — Sélectionner le créneau horaire
// ─────────────────────────────────────────────────────────────────────────────
log(`Étape 3 : Recherche créneau ${TIME_SLOT}...`);

const slotResult = await inject(`
  new Promise(resolve => {
    setTimeout(() => {
      const time = "${TIME_SLOT}";
      const all  = Array.from(document.querySelectorAll(
        'button, a, div[role="button"], li, span, td'
      ));

      // Cherche un élément dont le texte correspond exactement à l'heure
      const slot = all.find(el => {
        const txt = el.textContent.trim();
        return txt === time
          || txt === time.replace(':', 'h')
          || txt.startsWith(time + ' ')
          || txt.startsWith(time + '\\n');
      });

      if (slot) {
        slot.click();
        resolve("found");
        return;
      }

      // Lister les créneaux disponibles pour debug
      const dispo = all
        .filter(el => /^\\d{1,2}[h:]\\d{2}$/.test(el.textContent.trim()))
        .map(el => el.textContent.trim())
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 15)
        .join(", ");

      resolve("not_found|" + dispo);
    }, 2000);
  })
`, true);

log(`Créneau : ${slotResult}`);

if (slotResult.startsWith("not_found")) {
  const dispo = slotResult.split("|")[1] || "aucun";
  await notifier(
    "🎾 Cap 7 Padel — Créneau indispo",
    `${TIME_SLOT} non trouvé pour ${dateFR}.\nDisponibles : ${dispo}`,
    false
  );
  Script.complete();
  return;
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 4 — Cliquer Valider / Réserver
// ─────────────────────────────────────────────────────────────────────────────
log("Étape 4 : Valider...");
await attendre(2000);

await inject(`
  (() => {
    const btns = Array.from(document.querySelectorAll('button, a[href]'));
    const btn = btns.find(b =>
      /valider|réserver|confirmer|procéder|continuer/i.test(b.textContent)
    );
    if (btn) { btn.click(); return "ok"; }
    // Fallback : premier bouton de type submit
    const sub = document.querySelector('button[type="submit"]');
    if (sub) { sub.click(); return "submit"; }
    return "not_found";
  })()
`);

await attendre(3000);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 5 — Sélectionner "Paiement par participants"
// ─────────────────────────────────────────────────────────────────────────────
log("Étape 5 : Paiement par participants...");

const payResult = await inject(`
  (() => {
    // Chercher l'option "par participants" sous toutes ses formes
    const keywords = [
      /par participants?/i,
      /paiement individuel/i,
      /chaque participant/i,
      /split/i,
      /partager/i,
      /invitation/i,
    ];

    const all = Array.from(document.querySelectorAll(
      'button, label, div[role="radio"], div[role="button"], input[type="radio"], span, a'
    ));

    let found = null;
    for (const kw of keywords) {
      found = all.find(el => kw.test(el.textContent));
      if (found) break;
    }

    if (found) {
      found.click();
      // Si c'est un radio, cocher le label parent aussi
      if (found.tagName === 'INPUT') {
        found.checked = true;
        found.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return "selected";
    }

    return "not_found";
  })()
`);

log(`Paiement : ${payResult}`);
await attendre(1500);

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 6 — Confirmation finale
// ─────────────────────────────────────────────────────────────────────────────
log("Étape 6 : Confirmation finale...");

await inject(`
  (() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const btn = btns.find(b =>
      /valider|confirmer|payer|terminer|finaliser/i.test(b.textContent)
    );
    if (btn) { btn.click(); return "confirmed"; }
    return "no_btn";
  })()
`);

await attendre(3000);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION RÉSULTAT
// ─────────────────────────────────────────────────────────────────────────────
const payLabel = payResult === "selected"
  ? "Paiement par participants ✓"
  : "Paiement confirmé";

await notifier(
  "🎾 Cap 7 Padel — Réservé !",
  `✅ ${dateFR} à ${TIME_SLOT}\n${payLabel}`
);

log(`✅ Terminé — ${dateFR} ${TIME_SLOT}`);
Script.complete();
