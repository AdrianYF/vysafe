import React from 'react';
import NavBar from '../components/NavBar';

export default function Notificaciones() {
  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555', fontFamily: 'sans-serif' }}>
      <span style={{ fontSize: 48, marginBottom: 16 }}>🔔</span>
      <p style={{ fontSize: 16 }}>Muy pronto activamos esta función</p>
      <NavBar />
    </div>
  );
}