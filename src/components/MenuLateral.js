import React from 'react';
import './MenuLateral.css';

export default function MenuLateral({ onCerrar }) {
  const opciones = [
    { label: 'Mi perfil', icono: '👤' },
    { label: 'Mis contactos', icono: '👥' },
    { label: 'Notificaciones', icono: '🔔' },
    { label: 'Términos y condiciones', icono: '📄' },
    { label: 'Política de privacidad', icono: '🔒' },
    { label: 'Contactanos', icono: '✉️' },
    { label: 'Cerrar sesión', icono: '🚪' },
  ];

  return (
    <>
      <div className="menu-overlay" onClick={onCerrar} />
      <div className="menu-lateral">
        <div className="menu-header">
          <span className="menu-titulo">VySafe</span>
          <button className="menu-cerrar" onClick={onCerrar}>✕</button>
        </div>
        <ul className="menu-lista">
          {opciones.map((op) => (
            <li key={op.label} className="menu-item">
              <span className="menu-icono">{op.icono}</span>
              <span>{op.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}