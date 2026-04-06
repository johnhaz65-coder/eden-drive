import React, { useState, useEffect } from 'react';
import { getBookings } from '../api.js';

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function statusBadge(status) {
  if (status === 'confirmée') return <span className="badge badge-success">✓ Confirmée</span>;
  if (status === 'erreur')     return <span className="badge badge-danger">✗ Erreur</span>;
  return <span className="badge badge-warning">{status}</span>;
}

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    getBookings()
      .then(setBookings)
      .finally(() => setLoading(false));
  }, []);

  const grouped = bookings.reduce((acc, b) => {
    const key = b.date ? b.date.slice(0, 7) : 'Inconnu'; // "2024-11"
    if (!acc[key]) acc[key] = [];
    acc[key].push(b);
    return acc;
  }, {});

  const monthLabel = (key) => {
    if (key === 'Inconnu') return key;
    const [y, m] = key.split('-');
    return new Date(y, m - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="screen">
      <div className="page-title">
        <h1>Historique</h1>
        <p className="page-subtitle">Toutes vos tentatives de réservation</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h4" strokeLinecap="round" />
          </svg>
          <p>Aucune réservation pour l'instant.<br />Lancez une réservation depuis l'accueil !</p>
        </div>
      ) : (
        Object.keys(grouped).sort().reverse().map(month => (
          <div key={month}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'capitalize', marginBottom: 10, marginTop: 16 }}>
              {monthLabel(month)}
            </div>
            {grouped[month].map(b => (
              <div key={b.id} className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>
                      {b.date
                        ? new Date(b.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
                        : 'Date inconnue'}{' '}
                      {b.time && `à ${b.time}`}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 3 }}>
                      {new Date(b.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {statusBadge(b.status)}
                </div>
                {b.message && (
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    {b.message}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
