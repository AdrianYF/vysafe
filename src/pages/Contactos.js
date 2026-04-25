import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { QRCodeSVG } from 'qrcode.react';
import NavBar from '../components/NavBar';
import './Contactos.css';

export default function Contactos({ soloInvitar = false, onCerrar = null }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [linkGenerado, setLinkGenerado] = useState(null);
  const [editando, setEditando] = useState(null);
  const [apodo, setApodo] = useState('');
  const [eliminando, setEliminando] = useState(null);
  const [generandoLink, setGenerandoLink] = useState(false);

  const cargarContactos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('usuario_id', user.id);
    if (!error) setContactos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!soloInvitar) cargarContactos();
  }, [soloInvitar, cargarContactos]);

  useEffect(() => {
    if (soloInvitar) obtenerOGenerarLink();
  }, [soloInvitar]);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function obtenerOGenerarLink() {
    setGenerandoLink(true);
    const { data: { user } } = await supabase.auth.getUser();

    // Buscar si ya tiene un token permanente
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('invite_token')
      .eq('id', user.id)
      .maybeSingle();

    if (perfil?.invite_token) {
      const link = `${window.location.origin}/unirse/${perfil.invite_token}`;
      setLinkGenerado(link);
    } else {
      // Generar token nuevo y guardarlo
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await supabase.from('perfiles').upsert({ id: user.id, invite_token: token });
      const link = `${window.location.origin}/unirse/${token}`;
      setLinkGenerado(link);
    }
    setGenerandoLink(false);
  }

  async function guardarApodo(contactoId) {
    const { error } = await supabase
      .from('contactos')
      .update({ nombre: apodo })
      .eq('id', contactoId);

    if (!error) {
      setContactos(prev => prev.map(c => c.id === contactoId ? { ...c, nombre: apodo } : c));
      mostrarToast('✅ Apodo guardado');
    }
    setEditando(null);
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
    if (onCerrar) onCerrar();
  }

  const ModalLink = ({ onCerrarModal }) => (
    <div className="modal-overlay" onClick={onCerrarModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button
          onClick={onCerrarModal}
          style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}
        >✕</button>
        <h2>Invitá a alguien 🎉</h2>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Escaneá el QR o copiá el link</p>
        {generandoLink ? (
          <p style={{ color: '#888', textAlign: 'center' }}>Generando link...</p>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );

  if (soloInvitar) {
    return (
      <>
        {linkGenerado && <ModalLink onCerrarModal={cerrar} />}
        {generandoLink && (
          <div className="modal-overlay">
            <div className="modal">
              <p style={{ color: '#888', textAlign: 'center' }}>Generando link...</p>
            </div>
          </div>
        )}
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
            <li key={c.id} className="contacto-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (c.nombre || 'S').charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, color: '#fff', fontWeight: 600 }}>{c.nombre || 'Sin nombre'}</p>
                </div>

                {/* Botones */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setEditando(c.id); setApodo(c.nombre || ''); }}
                    style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: 4 }}
                  >✏️</button>
                  <button
                    onClick={() => setEliminando(c.id)}
                    style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: 4 }}
                  >🗑️</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Modal editar contacto */}
      {editando && (() => {
        const c = contactos.find(x => x.id === editando);
        return (
          <div className="modal-overlay" onClick={() => setEditando(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {c?.avatar_url ? (
                    <img src={c.avatar_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (c?.nombre || 'S').charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 600 }}>{c?.nombre}</p>
                </div>
              </div>

              <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Apodo (solo vos lo ves)
              </p>
              <input
                style={{ width: '100%', background: '#252525', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, boxSizing: 'border-box', marginBottom: 16 }}
                value={apodo}
                placeholder="Ej: Mamá, Jefe, etc."
                onChange={e => setApodo(e.target.value)}
                autoFocus
              />

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditando(null)}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 14, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => guardarApodo(editando)}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#2ecc71', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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

      <button className="btn-invitar" onClick={obtenerOGenerarLink}>
        + Invitar contacto
      </button>

      {linkGenerado && <ModalLink onCerrarModal={() => setLinkGenerado(null)} />}
      {toast && <div className="toast-contactos">{toast}</div>}

      <NavBar />
    </div>
  );
}