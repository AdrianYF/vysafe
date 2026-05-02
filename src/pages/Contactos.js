import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { QRCodeSVG } from 'qrcode.react';
import NavBar from '../components/NavBar';
import './Contactos.css';

const defaultMensajes = {
  verde: ['Llegué bien 😊', 'Ya se me pasó 💪', 'Ya se durmió 🙏'],
  amarillo: ['Saliendo, te aviso al llegar', 'Me siento maread@', 'Otra vez llegó borracho'],
};

export default function Contactos({ soloInvitar = false, onCerrar = null }) {
  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [linkGenerado, setLinkGenerado] = useState(null);
  const [editando, setEditando] = useState(null);
  const [apodo, setApodo] = useState('');
  const [eliminando, setEliminando] = useState(null);
  const [generandoLink, setGenerandoLink] = useState(false);
  const [configAlertas, setConfigAlertas] = useState(null);
  const [asignaciones, setAsignaciones] = useState({});
  const [invitacionesPendientes, setInvitacionesPendientes] = useState([]);

  const cargarContactos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('usuario_id', user.id);
    if (!error) setContactos(data || []);
    setLoading(false);
  }, []);

  const cargarConfig = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('config_alertas')
      .select('*')
      .eq('usuario_id', user.id);

    const cfg = {
      verde: { mensajes: [...defaultMensajes.verde], contactosPorMensaje: [{}, {}, {}] },
      amarillo: { mensajes: [...defaultMensajes.amarillo], contactosPorMensaje: [{}, {}, {}] },
      rojo: { contactos: [] },
    };

    (data || []).forEach(row => {
      if (row.color === 'rojo') {
        cfg.rojo.contactos = row.contactos ? row.contactos.split(',').filter(Boolean) : [];
      } else {
        const i = row.mensaje_index;
        if (cfg[row.color] && i < cfg[row.color].mensajes.length) {
          if (row.mensaje_texto) cfg[row.color].mensajes[i] = row.mensaje_texto;
          if (row.contactos) {
            cfg[row.color].contactosPorMensaje[i] = {};
            row.contactos.split(',').filter(Boolean).forEach(id => {
              cfg[row.color].contactosPorMensaje[i][id] = true;
            });
          }
        }
      }
    });

    setConfigAlertas(cfg);
  }, []);

  const cargarInvitacionesPendientes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('invitaciones_mensaje')
      .select('*')
      .eq('invitador_id', user.id)
      .eq('estado', 'pendiente');
    setInvitacionesPendientes(data || []);
  }, []);

  useEffect(() => {
    if (soloInvitar) return;
    cargarContactos();
    cargarConfig();
    cargarInvitacionesPendientes();

    let channelRef = { current: null };

    supabase.auth.getUser().then(({ data: { user } }) => {
      const nombreCanal = `contactos-${user.id}`;
      const existente = supabase.getChannels().find(c => c.topic === `realtime:${nombreCanal}`);
      if (existente) supabase.removeChannel(existente);

      channelRef.current = supabase
        .channel(nombreCanal)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'contactos',
            filter: `usuario_id=eq.${user.id}`,
          },
          (payload) => {
            setContactos(prev => {
              const yaExiste = prev.find(c => c.id === payload.new.id);
              if (yaExiste) return prev;
              mostrarToast(`🎉 ¡${payload.new.nombre || 'Alguien'} ya es tu contacto! Asignalo a un mensaje.`);
              return [...prev, payload.new];
            });
          }
        )
        .subscribe();
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [soloInvitar, cargarContactos, cargarConfig, cargarInvitacionesPendientes]);

  useEffect(() => {
    if (soloInvitar) obtenerOGenerarLink();
  }, [soloInvitar]);

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  async function obtenerOGenerarLink() {
    setGenerandoLink(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('invite_token')
      .eq('id', user.id)
      .maybeSingle();

    if (perfil?.invite_token) {
      setLinkGenerado(`${window.location.origin}/unirse/${perfil.invite_token}`);
    } else {
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await supabase.from('perfiles').upsert({ id: user.id, invite_token: token });
      setLinkGenerado(`${window.location.origin}/unirse/${token}`);
    }
    setGenerandoLink(false);
  }

  function abrirEdicion(c) {
    setEditando(c);
    setApodo(c.nombre || '');

    if (!configAlertas) return;
    const asig = {};

    ['verde', 'amarillo'].forEach(color => {
      configAlertas[color].mensajes.forEach((msg, i) => {
        const key = `${color}-${i}`;
        const yaAceptado = !!(configAlertas[color].contactosPorMensaje[i] || {})[c.contacto_id];
        const pendiente = invitacionesPendientes.some(
          inv => inv.contacto_id === c.contacto_id && inv.color === color && inv.mensaje_index === i
        );
        asig[key] = yaAceptado || pendiente;
      });
    });

    // Rojo: aceptado o pendiente
    const rojoAceptado = configAlertas.rojo.contactos.includes(c.contacto_id);
    const rojoPendiente = invitacionesPendientes.some(
      inv => inv.contacto_id === c.contacto_id && inv.color === 'rojo'
    );
    asig['rojo'] = rojoAceptado || rojoPendiente;

    setAsignaciones(asig);
  }

  async function guardarEdicion(contactoId, contactoUid) {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('contactos').update({ nombre: apodo }).eq('id', contactoId);
    setContactos(prev => prev.map(c => c.id === contactoId ? { ...c, nombre: apodo } : c));

    const nuevaConfig = JSON.parse(JSON.stringify(configAlertas));
    const nuevasInvitaciones = [];

    // Verde y amarillo
    for (const color of ['verde', 'amarillo']) {
      for (let i = 0; i < nuevaConfig[color].mensajes.length; i++) {
        const key = `${color}-${i}`;
        const yaAceptado = !!(configAlertas[color].contactosPorMensaje[i] || {})[contactoUid];
        const yaPendiente = invitacionesPendientes.some(
          inv => inv.contacto_id === contactoUid && inv.color === color && inv.mensaje_index === i
        );

        if (asignaciones[key] && !yaAceptado && !yaPendiente) {
          nuevasInvitaciones.push({
            color,
            mensajeIndex: i,
            mensajeTexto: nuevaConfig[color].mensajes[i],
          });
        } else if (!asignaciones[key] && yaAceptado) {
          delete nuevaConfig[color].contactosPorMensaje[i][contactoUid];
        }
      }
    }

    // Rojo: ahora también usa invitación
    const rojoAceptado = configAlertas.rojo.contactos.includes(contactoUid);
    const rojoPendiente = invitacionesPendientes.some(
      inv => inv.contacto_id === contactoUid && inv.color === 'rojo'
    );

    if (asignaciones['rojo'] && !rojoAceptado && !rojoPendiente) {
      // Nueva invitación rojo
      nuevasInvitaciones.push({
        color: 'rojo',
        mensajeIndex: 0,
        mensajeTexto: '🚨 Alerta de emergencia',
      });
    } else if (!asignaciones['rojo'] && rojoAceptado) {
      // Desasignar rojo aceptado
      nuevaConfig.rojo.contactos = nuevaConfig.rojo.contactos.filter(id => id !== contactoUid);
    }

    // Guardar config en Supabase (solo verde, amarillo y rojo aceptados)
    await supabase.from('config_alertas').delete().eq('usuario_id', user.id);

    const rows = [];
    ['verde', 'amarillo'].forEach(color => {
      nuevaConfig[color].mensajes.forEach((texto, i) => {
        rows.push({
          usuario_id: user.id,
          color,
          mensaje_index: i,
          mensaje_texto: texto,
          contactos: Object.keys(nuevaConfig[color].contactosPorMensaje[i] || {}).join(','),
        });
      });
    });
    rows.push({
      usuario_id: user.id,
      color: 'rojo',
      mensaje_index: 0,
      mensaje_texto: '',
      contactos: nuevaConfig.rojo.contactos.join(','),
    });

    await supabase.from('config_alertas').insert(rows);
    setConfigAlertas(nuevaConfig);

    // Mandar invitaciones
    if (nuevasInvitaciones.length > 0) {
      for (const inv of nuevasInvitaciones) {
        await supabase.from('invitaciones_mensaje').insert({
          invitador_id: user.id,
          contacto_id: contactoUid,
          color: inv.color,
          mensaje_index: inv.mensajeIndex,
          mensaje_texto: inv.mensajeTexto,
          estado: 'pendiente',
        });
      }

      const nombreInvitador = user.user_metadata?.full_name || user.user_metadata?.nombre || user.email;
      await fetch('/api/enviar-alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: `🔔 ${nombreInvitador} te invitó a ser parte de su red de mensajes`,
          contactos: [contactoUid],
          color: 'verde',
          url: 'https://www.vysafe.com/notificaciones',
          tipo: 'invitacion_red',
        }),
      });

      setInvitacionesPendientes(prev => [...prev, ...nuevasInvitaciones.map(inv => ({
        invitador_id: user.id,
        contacto_id: contactoUid,
        color: inv.color,
        mensaje_index: inv.mensajeIndex,
        mensaje_texto: inv.mensajeTexto,
        estado: 'pendiente',
      }))]);

      mostrarToast(`✉️ Invitación enviada a ${apodo}`);
    } else {
      mostrarToast('✅ Cambios guardados');
    }

    setEditando(null);
  }

  async function eliminarContacto(contactoId) {
    const { error } = await supabase.from('contactos').delete().eq('id', contactoId);
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

  const colores = [
    { key: 'verde', label: 'Verde', bg: '#2ecc71', emoji: '🟢' },
    { key: 'amarillo', label: 'Amarillo', bg: '#f39c12', emoji: '🟡' },
    { key: 'rojo', label: 'Rojo', bg: '#e74c3c', emoji: '🔴' },
  ];

  const Indicador = ({ asignado, pendiente, desasignando }) => {
    if (pendiente) return <span style={{ fontSize: 11, color: '#f39c12' }}>⏳</span>;
    if (desasignando) return (
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #e74c3c', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#e74c3c' }}>✕</div>
    );
    return (
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${asignado ? '#2ecc71' : '#444'}`, background: asignado ? '#2ecc71' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>
        {asignado && '✓'}
      </div>
    );
  };

  const ModalLink = ({ onCerrarModal }) => (
    <div className="modal-overlay" onClick={onCerrarModal}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        <button onClick={onCerrarModal} style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
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
              onClick={() => { navigator.clipboard.writeText(linkGenerado).catch(() => {}); mostrarToast('✅ Link copiado'); }}
            >Copiar link</button>
          </>
        )}
      </div>
    </div>
  );

  if (soloInvitar) {
    return (
      <>
        {linkGenerado && <ModalLink onCerrarModal={cerrar} />}
        {generandoLink && <div className="modal-overlay"><div className="modal"><p style={{ color: '#888', textAlign: 'center' }}>Generando link...</p></div></div>}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>
                  {c.avatar_url ? <img src={c.avatar_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (c.nombre || 'S').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 15, color: '#fff', fontWeight: 600 }}>{c.nombre || 'Sin nombre'}</p>
                  {c.email && <p style={{ margin: 0, fontSize: 12, color: '#666', marginTop: 2 }}>{c.email}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => abrirEdicion(c)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: 4 }}>✏️</button>
                  <button onClick={() => setEliminando(c.id)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer', padding: 4 }}>🗑️</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editando && (
        <div className="modal-overlay" onClick={() => setEditando(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '75vh', overflowY: 'auto', paddingBottom: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', overflow: 'hidden', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {editando.avatar_url ? <img src={editando.avatar_url} alt={editando.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (editando.nombre || 'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 16, color: '#fff', fontWeight: 600 }}>{editando.nombre}</p>
                {editando.email && <p style={{ margin: 0, fontSize: 12, color: '#666', marginTop: 2 }}>{editando.email}</p>}
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Apodo (solo vos lo ves)</p>
            <input
              style={{ width: '100%', background: '#252525', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, boxSizing: 'border-box', marginBottom: 20 }}
              value={apodo}
              placeholder="Ej: Mamá, Jefe, etc."
              onChange={e => setApodo(e.target.value)}
              autoFocus
            />

            <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Asignar a mensajes</p>

            {configAlertas && colores.map(({ key, label, emoji, bg }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#aaa' }}>{emoji} {label}</p>
                {key === 'rojo' ? (() => {
                  const rojoAceptado = configAlertas.rojo.contactos.includes(editando?.contacto_id);
                  const rojoPendiente = invitacionesPendientes.some(
                    inv => inv.contacto_id === editando?.contacto_id && inv.color === 'rojo'
                  );
                  const desasignando = rojoAceptado && !asignaciones['rojo'];
                  return (
                    <div
                      onClick={() => {
                        if (rojoPendiente) return;
                        setAsignaciones(prev => ({ ...prev, rojo: !prev.rojo }));
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                        background: desasignando ? '#2a1a1a' : asignaciones['rojo'] ? '#1e3a2a' : rojoPendiente ? '#2a2a1a' : '#252525',
                        border: `1px solid ${desasignando ? '#e74c3c' : asignaciones['rojo'] ? '#2ecc71' : rojoPendiente ? '#f39c12' : '#333'}`,
                        cursor: rojoPendiente ? 'default' : 'pointer'
                      }}
                    >
                      <span style={{ flex: 1, fontSize: 14, color: '#ccc' }}>🚨 Alerta de emergencia</span>
                      <Indicador asignado={asignaciones['rojo']} pendiente={rojoPendiente} desasignando={desasignando} />
                    </div>
                  );
                })() : (
                  configAlertas[key].mensajes.map((msg, i) => {
                    const k = `${key}-${i}`;
                    const yaAceptado = !!(configAlertas[key].contactosPorMensaje[i] || {})[editando?.contacto_id];
                    const yaPendiente = invitacionesPendientes.some(
                      inv => inv.contacto_id === editando?.contacto_id && inv.color === key && inv.mensaje_index === i
                    );
                    const desasignando = yaAceptado && !asignaciones[k];
                    return (
                      <div
                        key={i}
                        onClick={() => {
                          if (yaPendiente) return;
                          setAsignaciones(prev => ({ ...prev, [k]: !prev[k] }));
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                          background: desasignando ? '#2a1a1a' : asignaciones[k] ? '#1e3a2a' : yaPendiente ? '#2a2a1a' : '#252525',
                          border: `1px solid ${desasignando ? '#e74c3c' : asignaciones[k] ? '#2ecc71' : yaPendiente ? '#f39c12' : '#333'}`,
                          cursor: yaPendiente ? 'default' : 'pointer',
                          marginBottom: 6
                        }}
                      >
                        <span style={{ flex: 1, fontSize: 14, color: '#ccc' }}>{msg}</span>
                        <Indicador asignado={asignaciones[k]} pendiente={yaPendiente} desasignando={desasignando} />
                      </div>
                    );
                  })
                )}
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => setEditando(null)} style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => guardarEdicion(editando.id, editando.contacto_id)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#2ecc71', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {eliminando && (
        <div className="modal-overlay" onClick={() => setEliminando(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>¿Eliminar contacto?</h2>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>Esta acción no se puede deshacer.</p>
            <button onClick={() => eliminarContacto(eliminando)} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', background: '#e74c3c', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginBottom: 8 }}>Sí, eliminar</button>
            <button className="btn-cancelar" onClick={() => setEliminando(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <button className="btn-invitar" onClick={obtenerOGenerarLink}>+ Invitar contacto</button>

      {linkGenerado && <ModalLink onCerrarModal={() => setLinkGenerado(null)} />}
      {toast && <div className="toast-contactos">{toast}</div>}

      <NavBar />
    </div>
  );
}