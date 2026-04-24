import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { QRCodeSVG } from 'qrcode.react';
import NavBar from '../components/NavBar';
import './Contactos.css';

export default function Contactos({ soloInvitar = false, onCerrar = null }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarOpciones, setMostrarOpciones] = useState(soloInvitar);
  const [toast, setToast] = useState(null);
  const [linkGenerado, setLinkGenerado] = useState(null);

  useEffect(() => {
    if (!soloInvitar) cargarContactos();
  }, [soloInvitar]);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

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
      setLinkGenerado(link);
      setMostrarOpciones(false);
    }
  }

  function cerrar() {
    setLinkGenerado(null);
    setMostrarOpciones(false);
    if (onCerrar) onCerrar();
  }

  const ModalInvitar = () => (
    <div className="modal-overlay" onClick={cerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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

  const ModalLink = ({ onCerrarModal }) => (
    <div className="modal-overlay" onClick={onCerrarModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button
          onClick={onCerrarModal}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            color: '#888',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >✕</button>
        <h2>¡Link generado! 🎉</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Escaneá el QR o copiá el link
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <QRCodeSVG
            value={linkGenerado}
            size={180}
            bgColor="#1a1a1a"
            fgColor="#ffffff"
            level="H"
          />
        </div>
        <button
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: '#2ecc71',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
          onClick={() => {
            navigator.clipboard.writeText(linkGenerado).catch(() => {});
            mostrarToast('✅ Link copiado');
          }}
        >
          Copiar link
        </button>
      </div>
    </div>
  );

  if (soloInvitar) {
    return (
      <>
        {mostrarOpciones && <ModalInvitar />}
        {linkGenerado && <ModalLink onCerrarModal={cerrar} />}
        {toast && <div className="toast-contactos">{toast}</div>}
      </>
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

      {mostrarOpciones && <ModalInvitar />}
      {linkGenerado && <ModalLink onCerrarModal={() => setLinkGenerado(null)} />}
      {toast && <div className="toast-contactos">{toast}</div>}

      <NavBar />
    </div>
  );
}