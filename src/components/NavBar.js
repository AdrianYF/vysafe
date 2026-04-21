import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './NavBar.css';

export default function NavBar({ onInvitar, espejado }) {
  const navigate = useNavigate();
  const location = useLocation();

  const iconos = [
    {
      id: 'contactos', label: 'Contactos', ruta: '/contactos',
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    },
    {
      id: 'historial', label: 'Historial', ruta: '/historial',
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    },
    {
      id: 'invitar', label: 'Invitar', ruta: null,
      icon: <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    },
    {
      id: 'notificaciones', label: 'Alertas', ruta: '/notificaciones',
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
    },
    {
      id: 'inicio', label: 'Inicio', ruta: '/home',
      icon: <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    },
  ];

  const iconosOrdenados = espejado ? [...iconos].reverse() : iconos;

  function handleClick(item) {
    if (item.id === 'invitar') {
      if (onInvitar) onInvitar();
    } else if (item.ruta) {
      navigate(item.ruta);
    }
  }

  return (
    <nav className="navbar">
      {iconosOrdenados.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${item.id === 'invitar' ? 'nav-item-central' : ''} ${location.pathname === item.ruta ? 'activo' : ''}`}
          onClick={() => handleClick(item)}
        >
          {item.icon}
          {item.id !== 'invitar' && <span className="nav-label">{item.label}</span>}
        </button>
      ))}
    </nav>
  );
}