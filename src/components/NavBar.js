import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './NavBar.css';

export default function NavBar({ onInvitar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [espejado, setEspejado] = useState(false);

  const iconos = [
    { id: 'contactos', label: 'Contactos', icon: '👥', ruta: '/contactos' },
    { id: 'historial', label: 'Historial', icon: '📋', ruta: '/historial' },
    { id: 'invitar', label: 'Invitar', icon: '➕', ruta: null },
    { id: 'notificaciones', label: 'Notificaciones', icon: '🔔', ruta: '/notificaciones' },
    { id: 'inicio', label: 'Inicio', icon: '🏠', ruta: '/home' },
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
    <div className="navbar-wrapper">
      <button className="btn-espejo" onClick={() => setEspejado(!espejado)}>
        {espejado ? '→' : '←'}
      </button>
      <nav className="navbar">
        {iconosOrdenados.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${item.id === 'invitar' ? 'nav-item-central' : ''} ${location.pathname === item.ruta ? 'activo' : ''}`}
            onClick={() => handleClick(item)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}