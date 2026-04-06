import React, { useState, useEffect } from 'react';
import { getAccount, saveAccount, deleteAccount, startScheduler, stopScheduler, getScheduler } from '../api.js';

const CRON_OPTIONS = [
  { label: 'Tous les soirs à 21h30 (Cap 7 — recommandé)', value: '30 21 * * *' },
  { label: 'Tous les soirs à 21h00', value: '0 21 * * *' },
  { label: 'Tous les soirs à 22h00', value: '0 22 * * *' },
];

export default function Account() {
  const [account, setAccount]   = useState(null);
  const [form, setForm]         = useState({ email: '', password: '' });
  const [cron, setCron]         = useState('0 8 * * *');
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    Promise.all([getAccount(), getScheduler()])
      .then(([acc, s]) => {
        setAccount(acc);
        if (acc?.configured) setForm(f => ({ ...f, email: acc.email }));
      })
      .finally(() => setLoading(false));
  }, []);

  function showMsg(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      return showMsg('Email et mot de passe requis.', 'error');
    }
    setSaving(true);
    try {
      await saveAccount(form);
      await startScheduler(cron);
      setAccount({ configured: true, email: form.email });
      showMsg('Compte enregistré et automatisation activée !');
    } catch (err) {
      showMsg(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Déconnecter et désactiver la réservation automatique ?')) return;
    await Promise.all([deleteAccount(), stopScheduler()]);
    setAccount({ configured: false });
    setForm({ email: '', password: '' });
    showMsg('Compte déconnecté.');
  }

  if (loading) {
    return <div className="screen" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><span className="spinner" /></div>;
  }

  return (
    <div className="screen">
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}

      <div className="page-title">
        <h1>Compte</h1>
        <p className="page-subtitle">Identifiants Anybuddy pour Cap 7 Padel</p>
      </div>

      {/* Infos Anybuddy */}
      <div className="card" style={{ borderColor: 'rgba(212,160,23,0.25)', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22 }}>ℹ️</span>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', lineHeight: 1.5 }}>
            <strong style={{ color: 'white' }}>Anybuddy</strong> est la plateforme de réservation utilisée par Cap 7 Padel.
            Créez un compte sur <span style={{ color: 'var(--gold-light)' }}>anybuddyapp.com</span> puis entrez vos identifiants ici.
            Ils sont stockés <strong style={{ color: 'white' }}>uniquement sur votre appareil</strong>.
          </div>
        </div>
      </div>

      {/* Statut */}
      {account?.configured && (
        <div className="card" style={{ borderColor: 'rgba(67,160,71,0.3)', background: 'rgba(67,160,71,0.08)', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 22 }}>✅</span>
            <div>
              <div style={{ fontWeight: 600 }}>Connecté</div>
              <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>{account.email}</div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSave}>
        <div className="card">
          <h3 style={{ marginBottom: 16 }}>
            {account?.configured ? 'Modifier le compte' : 'Connexion Anybuddy'}
          </h3>

          <div className="form-group">
            <label className="form-label">Email Anybuddy</label>
            <input
              className="form-input"
              type="email"
              placeholder="votre@email.fr"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--gray-400)', fontSize: 18 }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="divider" />

          <div className="form-group">
            <label className="form-label">Fréquence automatique</label>
            <select
              className="form-input"
              value={cron}
              onChange={e => setCron(e.target.value)}
            >
              {CRON_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
              Cap 7 Padel ouvre les réservations 8 jours à l'avance. Déclenchez à 21h30 pour être parmi les premiers.
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" /> Enregistrement...</> : account?.configured ? '✓ Mettre à jour' : '🔐 Se connecter'}
          </button>
        </div>
      </form>

      {account?.configured && (
        <button
          className="btn btn-danger"
          style={{ marginTop: 12 }}
          onClick={handleDisconnect}
        >
          Se déconnecter
        </button>
      )}

      {/* Sécurité */}
      <div style={{ marginTop: 24, padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 12, color: 'var(--gray-400)', lineHeight: 1.6 }}>
          🔒 <strong style={{ color: 'var(--gray-200)' }}>Sécurité</strong><br />
          Vos identifiants sont stockés localement sur le serveur et ne sont jamais envoyés à un service tiers. Utilisez un compte dédié si nécessaire.
        </div>
      </div>
    </div>
  );
}
