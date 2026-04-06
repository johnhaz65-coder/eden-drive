import React, { useState, useEffect } from 'react';
import { getPreferences, addPreference, patchPreference, removePreference } from '../api.js';

// Créneaux disponibles Cap 7 Padel (7h à 22h)
const HEURES = Array.from({ length: 16 }, (_, i) => {
  const h = i + 7;
  return [`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`];
}).flat();

// Jours (pour l'affichage de la cible J+8)
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

function getTargetDayLabel() {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  const jour = JOURS[d.getDay()];
  return `${jour} ${d.getDate()}/${d.getMonth() + 1}`;
}

const DEFAULT_FORM = { time: '10:00', duration: 90, label: '' };

export default function Preferences() {
  const [prefs, setPrefs]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getPreferences()
      .then(setPrefs)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // daysInAdvance fixé à 8 — c'est le fonctionnement Cap 7 Padel
      const p = await addPreference({ ...form, daysInAdvance: 8 });
      setPrefs(prev => [...prev, p]);
      setShowForm(false);
      setForm(DEFAULT_FORM);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(pref) {
    try {
      const updated = await patchPreference(pref.id, { active: !pref.active });
      setPrefs(prev => prev.map(p => p.id === pref.id ? updated : p));
    } catch (e) { alert(e.message); }
  }

  async function handleDelete(id) {
    if (!confirm('Supprimer ce créneau ?')) return;
    await removePreference(id);
    setPrefs(prev => prev.filter(p => p.id !== id));
  }

  const targetLabel = getTargetDayLabel();

  return (
    <div className="screen">
      <div className="page-title">
        <h1>Créneaux</h1>
        <p className="page-subtitle">Chaque soir à 21h30 → réservation J+8</p>
      </div>

      {/* Explication du mécanisme */}
      <div className="card" style={{ borderColor: 'rgba(212,160,23,0.25)', background: 'rgba(212,160,23,0.06)', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🕘</span>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--gold-light)' }}>Fonctionnement Cap 7 Padel</strong><br />
            Les réservations s'ouvrent <strong style={{ color: 'white' }}>8 jours à l'avance</strong>.
            L'automatisation se déclenche chaque soir à <strong style={{ color: 'white' }}>21h30</strong> pour réserver le créneau du <strong style={{ color: 'white' }}>{targetLabel}</strong>.
            <br />Paiement : <strong style={{ color: 'white' }}>par participants</strong>.
          </div>
        </div>
      </div>

      <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? '✕ Annuler' : '+ Ajouter un créneau horaire'}
      </button>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="card" style={{ borderColor: 'rgba(212,160,23,0.3)', marginBottom: 20 }}>
          <h3 style={{ marginBottom: 4 }}>Nouveau créneau</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 16 }}>
            Choisissez l'heure du créneau à réserver automatiquement.
          </p>

          <div className="form-group">
            <label className="form-label">Heure du créneau</label>
            <select
              className="form-input"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
            >
              {HEURES.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Durée</label>
            <select
              className="form-input"
              value={form.duration}
              onChange={e => setForm(f => ({ ...f, duration: parseInt(e.target.value) }))}
            >
              <option value={60}>1h00</option>
              <option value={90}>1h30</option>
              <option value={120}>2h00</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Label (optionnel)</label>
            <input
              className="form-input"
              type="text"
              placeholder="ex : Padel du soir"
              value={form.label}
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
          </div>

          <div style={{ background: 'rgba(212,160,23,0.1)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--gold-light)' }}>
            Ce soir à 21h30 → réserve le <strong>{targetLabel}</strong> à <strong>{form.time}</strong>
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Enregistrement...</> : '✓ Enregistrer'}
          </button>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
      ) : prefs.length === 0 && !showForm ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M12 13v4M10 15h4" strokeLinecap="round" />
          </svg>
          <p>Aucun créneau configuré.<br />Ajoutez l'heure que vous voulez réserver !</p>
        </div>
      ) : (
        prefs.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label className="toggle">
                <input type="checkbox" checked={p.active} onChange={() => toggleActive(p)} />
                <span className="toggle-slider" />
              </label>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  {p.time} <span style={{ fontWeight: 400, fontSize: 13, color: 'var(--gray-400)' }}>· {p.duration} min</span>
                </div>
                {p.label && (
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{p.label}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--green-accent)', marginTop: 3 }}>
                  Réserve J+8 · paiement par participants
                </div>
              </div>

              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDelete(p.id)}
                style={{ width: 36, height: 36, padding: 0, fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
