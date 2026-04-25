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
  const [editandoNombre, setEditandoNombre] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [eliminando, setEliminando] = useState(null);

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

  async function guardarNombre(contactoId) {
    const { error } = await supabase
      .from('contactos')
      .update({ nombre: nuevoNombre })
      .eq('id', contactoId);

    if (!error) {
      setContactos(prev => prev.map(c => c.id === contactoId ? { ...c, nombre: nuevoNombre } : c));
      mostrarToast('✅ Nombre actualizado');
    }
    setEditandoNombre(null);
  }

  async function eliminarContacto(contactoId) {
    const { error } = await supabase
      .from('contactos')
      .delete()
      .eq('id', contactoId);

    if (!error) {
      setContactos(prev => prev.filter(c => c.id !== contactoId));
      mostrarToast('Contacto eliminado');
    }
    setEliminando(null);
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
          style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}
        >✕</button>
        <h2>¡Link generado! 🎉</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Escaneá el QR o copiá el link</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <QRCodeSVG value={linkGenerado} size={180} bgColor="#1a1a1a" fgColor="#ffffff" level="H" />
        </div>
        <button
          style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#2ecc71', color: '#fff', fontSize: '16px', fontWeight: '600', cursor: 'pointer' }}
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
        <p style={{ color: '#888' }}>Cargando...</p>
      ) : contactos.length === 0 ? (
        <p className="sin-contactos">Todavía no tenés contactos. ¡Invitá a alguien!</p>
      ) : (
        <ul className="lista-contactos">
          {contactos.map(c => (
            <li key={c.id} className="contacto-item">

              {/* Avatar */}
              <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (c.nombre || 'S').charAt(0).toUpperCase()
                )}
              </div>

              {/* Nombre o input de edición */}
              <div style={{ flex: 1 }}>
                {editandoNombre === c.id ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ flex: 1, background: '#252525', border: '1px solid #333', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 14 }}
                      value={nuevoNombre}
                      onChange={e => setNuevoNombre(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => guardarNombre(c.id)} style={{ background: '#2ecc71', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#fff', cursor: 'pointer', fontSize: 13 }}>✓</button>
                    <button onClick={() => setEditandoNombre(null)} style={{ background: '#333', border: 'none', borderRadius: 8, padding: '6px 10px', color: '#888', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  </div>
                ) : (
                  <span style={{ fontSize: 15, color: '#fff' }}>{c.nombre || 'Sin nombre'}</span>
                )}
              </div>

              {/* Botones acción */}
              {editandoNombre !== c.id && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => { setEditandoNombre(c.id); setNuevoNombre(c.nombre || ''); }}
                    style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: 4 }}
                  >✏️</button>
                  <button
                    onClick={() => setEliminando(c.id)}
                    style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: 4 }}
                  >🗑️</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Modal confirmar eliminación */}
      {eliminando && (
        <div className="modal-overlay" onClick={() => setEliminando(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>¿Eliminar contacto?</h2>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>Esta acción no se puede deshacer.</p>
            <button
              onClick={() => eliminarContacto(eliminando)}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#e74c3c', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}
            >
              Sí, eliminar
            </button>
            <button className="btn-cancelar" onClick={() => setEliminando(null)}>Cancelar</button>
          </div>
        </div>
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