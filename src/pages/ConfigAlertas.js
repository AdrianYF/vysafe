import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import NavBar from '../components/NavBar';

const defaultMensajes = {
  verde: ['Llegué bien 😊', 'Ya se me pasó 💪', 'Ya se durmió 🙏'],
  amarillo: ['Saliendo, te aviso al llegar', 'Me siento maread@', 'Otra vez llegó borracho'],
};

function getInstrucciones(label) {
  return [
    '1. Abrí Configuración en tu teléfono',
    '2. Entrá en Notificaciones → VySafe',
    '3. Tocá "Sonido"',
    `4. Elegí el archivo VySafe-${label}.wav`,
  ];
}

export default function ConfigAlertas() {
  const navigate = useNavigate();
  const [contactos, setContactos] = useState([]);
  const [config, setConfig] = useState(null);
  const [seccionAbierta, setSeccionAbierta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [textoEdit, setTextoEdit] = useState('');
  const [deleteProgress, setDeleteProgress] = useState({});
  const [mostrarInstrucciones, setMostrarInstrucciones] = useState(null);
  const [bloqueandoAgregar, setBloqueandoAgregar] = useState({});
  const [invitacionesPendientes, setInvitacionesPendientes] = useState([]);
  const [nuevasInvitaciones, setNuevasInvitaciones] = useState([]);
  const [toast, setToast] = useState(null);
  const deleteTimers = useRef({});

  const cargarDatos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: contactosData } = await supabase
      .from('contactos')
      .select('*')
      .eq('usuario_id', user.id);
    setContactos(contactosData || []);

    const { data: configData } = await supabase
      .from('config_alertas')
      .select('*')
      .eq('usuario_id', user.id);

    setConfig(armarConfig(configData || []));

    const { data: invitaciones } = await supabase
      .from('invitaciones_mensaje')
      .select('*')
      .eq('invitador_id', user.id)
      .eq('estado', 'pendiente');

    setInvitacionesPendientes(invitaciones || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  function armarConfig(rows) {
    const cfg = {
      verde: { mensajes: [], contactosPorMensaje: [] },
      amarillo: { mensajes: [], contactosPorMensaje: [] },
      rojo: { contactos: [] },
    };

    const tieneFilas = { verde: false, amarillo: false };

    rows.forEach(row => {
      if (row.color === 'rojo') {
        cfg.rojo.contactos = row.contactos ? row.contactos.split(',').filter(Boolean) : [];
      } else if (cfg[row.color]) {
        tieneFilas[row.color] = true;
        const i = row.mensaje_index;
        while (cfg[row.color].mensajes.length <= i) {
          cfg[row.color].mensajes.push(null);
          cfg[row.color].contactosPorMensaje.push({});
        }
        cfg[row.color].mensajes[i] = row.mensaje_texto || null;
        if (row.contactos) {
          cfg[row.color].contactosPorMensaje[i] = {};
          row.contactos.split(',').filter(Boolean).forEach(id => {
            cfg[row.color].contactosPorMensaje[i][id] = true;
          });
        }
      }
    });

    ['verde', 'amarillo'].forEach(color => {
      if (!tieneFilas[color]) {
        cfg[color].mensajes = [...defaultMensajes[color]];
        cfg[color].contactosPorMensaje = [{}, {}, {}];
      } else {
        const mensajesFiltrados = [];
        const contactosFiltrados = [];
        cfg[color].mensajes.forEach((msg, i) => {
          if (msg !== null) {
            mensajesFiltrados.push(msg);
            contactosFiltrados.push(cfg[color].contactosPorMensaje[i] || {});
          }
        });
        cfg[color].mensajes = mensajesFiltrados;
        cfg[color].contactosPorMensaje = contactosFiltrados;
      }
    });

    return cfg;
  }

  function mostrarToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function guardarMensaje(color, index) {
    const { data: { user } } = await supabase.auth.getUser();
    const nueva = JSON.parse(JSON.stringify(config));
    nueva[color].mensajes[index] = textoEdit;
    setConfig(nueva);

    await supabase.from('config_alertas')
      .delete()
      .eq('usuario_id', user.id)
      .eq('color', color)
      .eq('mensaje_index', index);

    await supabase.from('config_alertas').insert({
      usuario_id: user.id,
      color,
      mensaje_index: index,
      mensaje_texto: textoEdit,
      contactos: Object.keys(nueva[color].contactosPorMensaje[index] || {}).join(','),
    });

    const invitacionesParaEsteMensaje = nuevasInvitaciones.filter(
      inv => inv.color === color && inv.mensajeIndex === index
    );

    for (const inv of invitacionesParaEsteMensaje) {
      await supabase.from('invitaciones_mensaje').insert({
        invitador_id: user.id,
        contacto_id: inv.contactoId,
        color,
        mensaje_index: index,
        mensaje_texto: textoEdit,
        estado: 'pendiente',
      });

      await fetch('/api/enviar-alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: `Te invitaron a ser contacto del mensaje "${textoEdit}"`,
          contactos: [inv.contactoId],
          color,
          url: 'https://www.vysafe.com/notificaciones',
        }),
      });

      setInvitacionesPendientes(prev => [...prev, {
        invitador_id: user.id,
        contacto_id: inv.contactoId,
        color,
        mensaje_index: index,
        mensaje_texto: textoEdit,
        estado: 'pendiente',
      }]);
    }

    setNuevasInvitaciones(prev => prev.filter(
      inv => !(inv.color === color && inv.mensajeIndex === index)
    ));

    setEditando(null);
    if (invitacionesParaEsteMensaje.length > 0) {
      mostrarToast(`✉️ ${invitacionesParaEsteMensaje.length} invitación(es) enviada(s)`);
    }
  }

  function toggleContactoLocal(color, mensajeIndex, contactoId) {
    const seleccionado = !!(config[color]?.contactosPorMensaje?.[mensajeIndex] || {})[contactoId];
    const pendiente = invitacionesPendientes.some(
      inv => inv.contacto_id === contactoId && inv.color === color && inv.mensaje_index === mensajeIndex
    );
    const nuevaInvitacion = nuevasInvitaciones.some(
      inv => inv.contactoId === contactoId && inv.color === color && inv.mensajeIndex === mensajeIndex
    );

    if (seleccionado) {
      const nueva = JSON.parse(JSON.stringify(config));
      delete nueva[color].contactosPorMensaje[mensajeIndex][contactoId];
      setConfig(nueva);
      return;
    }

    if (pendiente) {
      mostrarToast('Ya enviaste una invitación a este contacto');
      return;
    }

    if (nuevaInvitacion) {
      setNuevasInvitaciones(prev => prev.filter(
        inv => !(inv.contactoId === contactoId && inv.color === color && inv.mensajeIndex === mensajeIndex)
      ));
      return;
    }

    setNuevasInvitaciones(prev => [...prev, { contactoId, color, mensajeIndex }]);
  }

  async function toggleContactoRojo(contactoId) {
    const { data: { user } } = await supabase.auth.getUser();
    const rojoAceptado = config.rojo.contactos.includes(contactoId);
    const rojoPendiente = invitacionesPendientes.some(
      inv => inv.contacto_id === contactoId && inv.color === 'rojo'
    );

    if (rojoAceptado) {
      // Desasignar
      const nueva = JSON.parse(JSON.stringify(config));
      nueva.rojo.contactos = nueva.rojo.contactos.filter(id => id !== contactoId);

      await supabase.from('config_alertas')
        .delete()
        .eq('usuario_id', user.id)
        .eq('color', 'rojo');

      await supabase.from('config_alertas').insert({
        usuario_id: user.id,
        color: 'rojo',
        mensaje_index: 0,
        mensaje_texto: '',
        contactos: nueva.rojo.contactos.join(','),
      });

      setConfig(nueva);
      mostrarToast('Contacto removido de alerta roja');
      return;
    }

    if (rojoPendiente) {
      mostrarToast('Ya enviaste una invitación a este contacto');
      return;
    }

    // Mandar invitación
    await supabase.from('invitaciones_mensaje').insert({
      invitador_id: user.id,
      contacto_id: contactoId,
      color: 'rojo',
      mensaje_index: 0,
      mensaje_texto: '🚨 Alerta de emergencia',
      estado: 'pendiente',
    });

    const nombre = user.user_metadata?.full_name || user.user_metadata?.nombre || user.email;
    await fetch('/api/enviar-alerta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: `🔔 ${nombre} te invitó a ser su contacto de emergencia`,
        contactos: [contactoId],
        color: 'rojo',
        url: 'https://www.vysafe.com/notificaciones',
        tipo: 'invitacion_red',
      }),
    });

    setInvitacionesPendientes(prev => [...prev, {
      invitador_id: user.id,
      contacto_id: contactoId,
      color: 'rojo',
      mensaje_index: 0,
      mensaje_texto: '🚨 Alerta de emergencia',
      estado: 'pendiente',
    }]);

    mostrarToast('✉️ Invitación de emergencia enviada');
  }

  async function retirarInvitacion(contactoId, color, mensajeIndex) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('invitaciones_mensaje')
      .delete()
      .eq('invitador_id', user.id)
      .eq('contacto_id', contactoId)
      .eq('color', color)
      .eq('mensaje_index', mensajeIndex);

    setInvitacionesPendientes(prev => prev.filter(
      inv => !(inv.contacto_id === contactoId && inv.color === color && inv.mensaje_index === mensajeIndex)
    ));

    mostrarToast('Invitación retirada');
  }

  function iniciarDelete(color, index) {
    const key = `${color}-${index}`;
    let progress = 0;
    setDeleteProgress(prev => ({ ...prev, [key]: 0 }));

    deleteTimers.current[key] = setInterval(() => {
      progress += 100 / 20;
      setDeleteProgress(prev => ({ ...prev, [key]: progress }));

      if (progress >= 100) {
        clearInterval(deleteTimers.current[key]);
        borrarMensaje(color, index);
        setDeleteProgress(prev => ({ ...prev, [key]: 0 }));
      }
    }, 100);
  }

  function cancelarDelete(color, index) {
    const key = `${color}-${index}`;
    clearInterval(deleteTimers.current[key]);
    setDeleteProgress(prev => ({ ...prev, [key]: 0 }));
  }

  async function borrarMensaje(color, index) {
    const { data: { user } } = await supabase.auth.getUser();
    const nueva = JSON.parse(JSON.stringify(config));
    nueva[color].mensajes.splice(index, 1);
    nueva[color].contactosPorMensaje.splice(index, 1);

    await supabase.from('config_alertas')
      .delete()
      .eq('usuario_id', user.id)
      .eq('color', color);

    if (nueva[color].mensajes.length > 0) {
      const rows = nueva[color].mensajes.map((texto, i) => ({
        usuario_id: user.id,
        color,
        mensaje_index: i,
        mensaje_texto: texto,
        contactos: Object.keys(nueva[color].contactosPorMensaje[i] || {}).join(','),
      }));
      await supabase.from('config_alertas').insert(rows);
    } else {
      await supabase.from('config_alertas').insert({
        usuario_id: user.id,
        color,
        mensaje_index: 0,
        mensaje_texto: '__borrado__',
        contactos: '',
      });
    }

    setConfig(nueva);
    setBloqueandoAgregar(prev => ({ ...prev, [color]: true }));
    setTimeout(() => {
      setBloqueandoAgregar(prev => ({ ...prev, [color]: false }));
    }, 800);
  }

  function descargarRingtone(key, label) {
    const a = document.createElement('a');
    a.href = `/VySafe-${label}.wav`;
    a.download = `VySafe-${label}.wav`;
    a.click();
    setMostrarInstrucciones(label);
  }

  const colores = [
    { key: 'verde', label: 'Verde', emoji: '🟢', bg: '#2ecc71' },
    { key: 'amarillo', label: 'Amarillo', emoji: '🟡', bg: '#f39c12' },
    { key: 'rojo', label: 'Rojo', emoji: '🔴', bg: '#e74c3c' },
  ];

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <p>Cargando...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', fontFamily: 'sans-serif', color: '#fff', paddingBottom: 100 }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#2a2a2a', border: '1px solid #333', borderRadius: 12, padding: '10px 20px', fontSize: 14, color: '#fff', zIndex: 999, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 10px', borderBottom: '1px solid #1a1a1a' }}>
        <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 22, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 600 }}>Configuración de alertas</span>
      </div>

      {mostrarInstrucciones && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setMostrarInstrucciones(null)}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>✅ Ringtone descargado</h3>
            <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Seguí estos pasos para asignarlo en tu teléfono:</p>
            {getInstrucciones(mostrarInstrucciones).map((paso, i) => (
              <p key={i} style={{ fontSize: 14, color: '#ccc', margin: '6px 0' }}>{paso}</p>
            ))}
            <button
              onClick={() => setMostrarInstrucciones(null)}
              style={{ marginTop: 20, width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#2ecc71', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {editando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => { setEditando(null); setNuevasInvitaciones([]); }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Editar mensaje</h3>
            <input
              style={{ width: '100%', background: '#252525', border: '1px solid #333', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, boxSizing: 'border-box', marginBottom: 16 }}
              value={textoEdit}
              maxLength={50}
              onChange={e => setTextoEdit(e.target.value)}
              autoFocus
            />

            <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Contactos para este mensaje
            </p>

            {contactos.length === 0 ? (
              <p style={{ color: '#555', fontSize: 13, marginBottom: 16 }}>Todavía no tenés contactos.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {contactos.map(c => {
                  const seleccionado = !!(config[editando.color]?.contactosPorMensaje?.[editando.index] || {})[c.contacto_id];
                  const pendiente = invitacionesPendientes.some(
                    inv => inv.contacto_id === c.contacto_id &&
                           inv.color === editando.color &&
                           inv.mensaje_index === editando.index
                  );
                  const nuevaInv = nuevasInvitaciones.some(
                    inv => inv.contactoId === c.contacto_id &&
                           inv.color === editando.color &&
                           inv.mensajeIndex === editando.index
                  );
                  const bg = colores.find(col => col.key === editando.color)?.bg || '#888';

                  let bgColor = '#252525';
                  let borderColor = '#333';
                  if (seleccionado) { bgColor = '#1e3a2a'; borderColor = '#2ecc71'; }
                  else if (pendiente) { bgColor = '#2a2a1a'; borderColor = '#f39c12'; }
                  else if (nuevaInv) { bgColor = '#1a2a3a'; borderColor = '#3498db'; }

                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleContactoLocal(editando.color, editando.index, c.contacto_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: bgColor, border: `1px solid ${borderColor}`, cursor: pendiente ? 'default' : 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, overflow: 'hidden', flexShrink: 0 }}>
                        {c.avatar_url
                          ? <img src={c.avatar_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : (c.nombre || 'S').charAt(0).toUpperCase()
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14 }}>{c.nombre || 'Sin nombre'}</span>
                        {pendiente && <p style={{ fontSize: 11, color: '#f39c12', margin: 0 }}>⏳ Pendiente de respuesta</p>}
                        {nuevaInv && <p style={{ fontSize: 11, color: '#3498db', margin: 0 }}>📨 Se enviará al guardar</p>}
                        {seleccionado && <p style={{ fontSize: 11, color: '#2ecc71', margin: 0 }}>✅ Aceptado</p>}
                      </div>
                      {pendiente && (
                        <button
                          onClick={e => { e.stopPropagation(); retirarInvitacion(c.contacto_id, editando.color, editando.index); }}
                          style={{ background: 'transparent', border: '1px solid #e74c3c', borderRadius: 8, color: '#e74c3c', fontSize: 11, padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }}
                        >
                          Retirar
                        </button>
                      )}
                      {!pendiente && (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${seleccionado ? '#2ecc71' : nuevaInv ? '#3498db' : '#444'}`, background: seleccionado ? '#2ecc71' : nuevaInv ? '#3498db' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', flexShrink: 0 }}>
                          {(seleccionado || nuevaInv) && '✓'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setEditando(null); setNuevasInvitaciones([]); }}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 14, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => guardarMensaje(editando.color, editando.index)}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#2ecc71', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {colores.map(({ key, label, emoji, bg }) => (
        <div key={key} style={{ margin: '12px 16px', borderRadius: 16, overflow: 'hidden', border: '1px solid #1a1a1a' }}>

          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: '#1a1a1a', cursor: 'pointer' }}
            onClick={() => setSeccionAbierta(seccionAbierta === key ? null : key)}
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>{emoji} {label}</span>
            <span style={{ color: '#888' }}>{seccionAbierta === key ? '▲' : '▼'}</span>
          </div>

          {seccionAbierta === key && (
            <div style={{ background: '#111', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

              <button
                onClick={() => descargarRingtone(key, label)}
                style={{ padding: '10px 14px', borderRadius: 12, border: `1px solid ${bg}`, background: 'transparent', color: bg, fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
              >
                🔔 Descargar ringtone {label}
              </button>

              {key === 'rojo' ? (
                <>
                  <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                    Contactos de emergencia
                  </p>
                  {contactos.length === 0 ? (
                    <p style={{ color: '#555', fontSize: 13 }}>Todavía no tenés contactos. ¡Invitá a alguien!</p>
                  ) : (
                    contactos.map(c => {
                      const aceptado = config.rojo.contactos.includes(c.contacto_id);
                      const pendiente = invitacionesPendientes.some(
                        inv => inv.contacto_id === c.contacto_id && inv.color === 'rojo'
                      );
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleContactoRojo(c.contacto_id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10,
                            background: aceptado ? '#1e3a2a' : pendiente ? '#2a2a1a' : '#1a1a1a',
                            border: `1px solid ${aceptado ? '#2ecc71' : pendiente ? '#f39c12' : '#2a2a2a'}`,
                            cursor: pendiente ? 'default' : 'pointer', userSelect: 'none'
                          }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, overflow: 'hidden', flexShrink: 0 }}>
                            {c.avatar_url
                              ? <img src={c.avatar_url} alt={c.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : (c.nombre || 'S').charAt(0).toUpperCase()
                            }
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 14 }}>{c.nombre || 'Sin nombre'}</span>
                            {pendiente && <p style={{ fontSize: 11, color: '#f39c12', margin: 0 }}>⏳ Pendiente de respuesta</p>}
                            {aceptado && <p style={{ fontSize: 11, color: '#2ecc71', margin: 0 }}>✅ Aceptado</p>}
                          </div>
                          {pendiente && (
                            <button
                              onClick={e => { e.stopPropagation(); retirarInvitacion(c.contacto_id, 'rojo', 0); }}
                              style={{ background: 'transparent', border: '1px solid #e74c3c', borderRadius: 8, color: '#e74c3c', fontSize: 11, padding: '4px 8px', cursor: 'pointer', flexShrink: 0 }}
                            >
                              Retirar
                            </button>
                          )}
                          {!pendiente && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${aceptado ? '#2ecc71' : '#444'}`, background: aceptado ? '#2ecc71' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>
                              {aceptado && '✓'}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              ) : (
                <>
                  {config[key].mensajes.map((msg, i) => {
                    const deleteKey = `${key}-${i}`;
                    const progress = deleteProgress[deleteKey] || 0;
                    return (
                      <div key={i} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: '#e74c3c', opacity: 0.3, transition: 'width 0.1s linear', pointerEvents: 'none' }} />
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10 }}>
                          <span style={{ flex: 1, fontSize: 14, color: '#ccc' }}>{msg}</span>
                          <button
                            onClick={() => { setEditando({ color: key, index: i }); setTextoEdit(msg); setNuevasInvitaciones([]); }}
                            style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer', padding: '4px 6px' }}
                          >✏️</button>
                          <button
                            onMouseDown={() => iniciarDelete(key, i)}
                            onMouseUp={() => cancelarDelete(key, i)}
                            onMouseLeave={() => cancelarDelete(key, i)}
                            onTouchStart={() => iniciarDelete(key, i)}
                            onTouchEnd={() => cancelarDelete(key, i)}
                            onTouchCancel={() => cancelarDelete(key, i)}
                            style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer', padding: '4px 6px' }}
                          >🗑️</button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => {
                      if (bloqueandoAgregar[key]) return;
                      const nueva = JSON.parse(JSON.stringify(config));
                      nueva[key].mensajes.push('Nuevo mensaje');
                      nueva[key].contactosPorMensaje.push({});
                      setConfig(nueva);
                    }}
                    style={{ padding: '10px', borderRadius: 10, border: '1px dashed #333', background: 'transparent', color: bloqueandoAgregar[key] ? '#333' : '#888', fontSize: 14, cursor: bloqueandoAgregar[key] ? 'default' : 'pointer', textAlign: 'center' }}
                  >
                    + Agregar mensaje
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      <NavBar />
    </div>
  );
}