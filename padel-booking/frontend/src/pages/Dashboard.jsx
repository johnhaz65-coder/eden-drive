import React, { useState, useEffect, useCallback } from 'react';
import { getAccount, getPreferences, getScheduler, runBookings, subscribeEvents } from '../api.js';
import { useNavigate } from 'react-router-dom';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [prefs, setPrefs]     = useState([]);
  const [scheduler, setSched] = useState(null);
  const [running, setRunning] = useState(false);
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(true);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    Promise.all([getAccount(), getPreferences(), getScheduler()])
      .then(([acc, p, s]) => { setAccount(acc); setPrefs(p); setSched(s); })
      .catch(() => {})
      .finally(() => setLoading(false));

    const unsub = subscribeEvents({
      booking_start: () => setRunning(true),
      booking_done:  (results) => {
        setRunning(false);
        const ok = results.filter(r => r.success).length;
        showToast(`${ok}/${results.length} réservation(s) confirmée(s)`, ok > 0 ? 'success' : 'error');
      },
      booking_error: (e) => { setRunning(false); showToast(e.error, 'error'); },
    });
    return unsub;
  }, [showToast]);

  async function handleRunNow() {
    if (!account?.configured) {
      navigate('/account');
      return;
    }
    setRunning(true);
    try {
      await runBookings();
    } catch (e) {
      showToast(e.message, 'error');
      setRunning(false);
    }
  }

  const activePrefs = prefs.filter(p => p.active);
  const nextRun = scheduler?.nextRun ? new Date(scheduler.nextRun) : null;

  return (
    <div className="screen">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <span style={{ fontSize: 32 }}>🎾</span>
          <div>
            <h1>Cap 7 Padel</h1>
            <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>Réservation automatique</p>
          </div>
        </div>
      </div>

      {/* Statut compte */}
      {!loading && !account?.configured && (
        <div className="card" style={{ borderColor: 'rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.08)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22 }}>⚠️</span>
            <div>
              <h3 style={{ marginBottom: 6 }}>Configurez votre compte</h3>
              <p style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 12 }}>
                Connectez votre compte Anybuddy pour activer la réservation automatique.
              </p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/account')}>
                Configurer →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lancer maintenant */}
      <button
        className="btn btn-primary"
        onClick={handleRunNow}
        disabled={running}
        style={{ marginBottom: 16, fontSize: 16 }}
      >
        {running ? <><span className="spinner" /> Réservation en cours...</> : '⚡ Réserver maintenant'}
      </button>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold-light)' }}>{activePrefs.length}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Créneau{activePrefs.length > 1 ? 'x' : ''} actif{activePrefs.length > 1 ? 's' : ''}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gold-light)' }}>
            {account?.configured ? '✓' : '✗'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>Compte connecté</div>
        </div>
      </div>

      {/* Prochain passage automatique */}
      {nextRun && (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 24 }}>🕐</span>
            <div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 2 }}>Prochain passage automatique</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {nextRun.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' à '}
                {nextRun.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Créneaux configurés */}
      <div style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ marginBottom: 0 }}>Mes créneaux</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/preferences')}>
            + Ajouter
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
        ) : prefs.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <p>Aucun créneau configuré</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/preferences')}>
              Ajouter un créneau
            </button>
          </div>
        ) : (
          prefs.map(p => (
            <div key={p.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>
                    {JOURS[p.dayOfWeek]} à {p.time}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    {p.duration} min · {p.daysInAdvance}j à l'avance
                  </div>
                </div>
                <span className={`badge ${p.active ? 'badge-success' : 'badge-gray'}`}>
                  {p.active ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
