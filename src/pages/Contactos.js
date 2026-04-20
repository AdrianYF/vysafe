import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import NavBar from '../components/NavBar';
import './Contactos.css';

export default function Contactos({ soloInvitar = false, onCerrar = null }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarOpciones, setMostrarOpciones] = useState(soloInvitar);

  useEffect(() => {
    if (!soloInvitar) cargarContactos();
  }, [soloInvitar]);

  async function cargarContactos() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('usuario_id', user.id);
    if (!error) setContactos(data);
    setLoading(false);
  }

  async function generarInvitacion(tipo, alertas) {
    const { data: { user } } = await supabase.auth.getUser();
    const token = Math.random().toString(36).substring(2, 15);
    const { error } = await supabase.from('invitaciones').insert({
      invitador_id: user.id,
      token,
      tipo,
      alerta_verde: alertas.includes('verde'),
      alerta_amarilla: alertas.includes('amarilla'),
      alerta_roja: alertas.includes('roja'),
    });
    if (!error) {
      const link = `${window.location.origin}/unirse/${token}`;
      await navigator.clipboard.writeText(link);
      alert('¡Link copiado! Mandáselo a tu contacto.');
    }
    setMostrarOpciones(false);
    if (onCerrar) onCerrar();
  }

  function cerrar() {
    setMostrarOpciones(false);
    if (onCerrar) onCerrar();
  }

  if (soloInvitar) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h2>¿Cómo querés invitarlo?</h2>
          <button className="btn-opcion" onClick={() => generarInvitacion('red', [])}>
            👥 Solo invitar a mi red
          </button>
          <button className="btn-opcion alerta" onClick={() => generarInvitacion('alerta', ['verde', 'amarilla', 'roja'])}>
            🚨 Invitar como contacto de alerta
          </button>
          <button className="btn-cancelar" onClick={cerrar}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="contactos-container">
      <h1>Mis Contactos</h1>

      {loading ? (
        <p>Cargando...</p>
      ) : contactos.length === 0 ? (
        <p className="sin-contactos">Todavía no tenés contactos. ¡Invitá a alguien!</p>
      ) : (
        <ul className="lista-contactos">
          {contactos.map(c => (
            <li key={c.id} className="contacto-item">
              <span>{c.nombre || 'Sin nombre'}</span>
              <span className="tipo-badge">{c.tipo === 'alerta' ? '🚨 Alerta' : '👥 Red'}</span>
            </li>
          ))}
        </ul>
      )}

      <button className="btn-invitar" onClick={() => setMostrarOpciones(true)}>
        + Invitar contacto
      </button>

      {mostrarOpciones && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>¿Cómo querés invitarlo?</h2>
            <button className="btn-opcion" onClick={() => generarInvitacion('red', [])}>
              👥 Solo invitar a mi red
            </button>
            <button className="btn-opcion alerta" onClick={() => generarInvitacion('alerta', ['verde', 'amarilla', 'roja'])}>
              🚨 Invitar como contacto de alerta
            </button>
            <button className="btn-cancelar" onClick={() => setMostrarOpciones(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}