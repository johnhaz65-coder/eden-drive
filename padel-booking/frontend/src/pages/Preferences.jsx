import React, { useState, useEffect } from 'react';
import { getPreferences, addPreference, patchPreference, removePreference } from '../api.js';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return [`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`];
}).flat();

const DEFAULT_FORM = { dayOfWeek: 1, time: '10:00', duration: 90, daysInAdvance: 7 };

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
      const p = await addPreference(form);
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

  return (
    <div className="screen">
      <div className="page-title">
        <h1>Créneaux</h1>
        <p className="page-subtitle">Configurez quand réserver automatiquement</p>
      </div>

      <button className="btn btn-primary" style={{ marginBottom: 20 }} onClick={() => setShowForm(!showForm)}>
        {showForm ? '✕ Annuler' : '+ Nouveau créneau'}
      </button>

      {/* Formulaire ajout */}
      {showForm && (
        <div className="card" style={{ borderColor: 'rgba(212,160,23,0.3)', marginBottom: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Nouveau créneau automatique</h3>

          <div className="form-group">
            <label className="form-label">Jour</label>
            <select
              className="form-input"
              value={form.dayOfWeek}
              onChange={e => setForm(f => ({ ...f, dayOfWeek: parseInt(e.target.value) }))}
            >
              {JOURS.map((j, i) => <option key={i} value={i}>{j}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Heure</label>
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
            <label className="form-label">Réserver à l'avance</label>
            <select
              className="form-input"
              value={form.daysInAdvance}
              onChange={e => setForm(f => ({ ...f, daysInAdvance: parseInt(e.target.value) }))}
            >
              <option value={1}>1 jour avant</option>
              <option value={3}>3 jours avant</option>
              <option value={7}>7 jours avant</option>
              <option value={14}>14 jours avant</option>
            </select>
          </div>

          <div style={{ background: 'rgba(212,160,23,0.1)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--gold-light)' }}>
            📅 Réservera automatiquement le prochain <strong>{JOURS[form.dayOfWeek]}</strong> à <strong>{form.time}</strong>, {form.daysInAdvance}j à l'avance.
          </div>

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner" /> Enregistrement...</> : '✓ Enregistrer ce créneau'}
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
          <p>Aucun créneau configuré.<br />Ajoutez votre premier créneau !</p>
        </div>
      ) : (
        prefs.map(p => (
          <div key={p.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Toggle actif */}
              <label className="toggle">
                <input type="checkbox" checked={p.active} onChange={() => toggleActive(p)} />
                <span className="toggle-slider" />
              </label>

              {/* Infos */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {JOURS[p.dayOfWeek]} à {p.time}
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                  {p.duration} min · {p.daysInAdvance}j à l'avance
                </div>
              </div>

              {/* Supprimer */}
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
