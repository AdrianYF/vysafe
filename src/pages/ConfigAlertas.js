import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import NavBar from '../components/NavBar';

const defaultMensajes = {
  verde: ['Llegué bien a destino', 'Estoy en lugar seguro', 'Todo tranquilo'],
  amarillo: ['Saliendo de casa', 'Subiendo al colectivo', 'Caminando, todo bien'],
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

    // Si no tiene filas en BD, usar defaults
    ['verde', 'amarillo'].forEach(color => {
      if (!tieneFilas[color]) {
        cfg[color].mensajes = [...defaultMensajes[color]];
        cfg[color].contactosPorMensaje = [{}, {}, {}];
      } else {
        // Filtrar nulls (mensajes borrados)
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

    setEditando(null);
  }

  async function toggleContacto(color, mensajeIndex, contactoId) {
    const { data: { user } } = await supabase.auth.getUser();
    const nueva = JSON.parse(JSON.stringify(config));

    if (color === 'rojo') {
      const lista = nueva.rojo.contactos;
      if (lista.includes(contactoId)) {
        nueva.rojo.contactos = lista.filter(id => id !== contactoId);
      } else {
        nueva.rojo.contactos = [...lista, contactoId];
      }

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
    } else {
      const mapa = nueva[color].contactosPorMensaje[mensajeIndex];
      if (mapa[contactoId]) {
        delete mapa[contactoId];
      } else {
        mapa[contactoId] = true;
      }

      await supabase.from('config_alertas')
        .delete()
        .eq('usuario_id', user.id)
        .eq('color', color)
        .eq('mensaje_index', mensajeIndex);

      await supabase.from('config_alertas').insert({
        usuario_id: user.id,
        color,
        mensaje_index: mensajeIndex,
        mensaje_texto: nueva[color].mensajes[mensajeIndex],
        contactos: Object.keys(nueva[color].contactosPorMensaje[mensajeIndex]).join(','),
      });
    }

    setConfig(nueva);
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
      // Guardar fila marcadora para indicar que el usuario borró todo
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
    a.href = `/alerta-${key}.wav`;
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
          onClick={() => setEditando(null)}>
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
                  const bg = colores.find(col => col.key === editando.color)?.bg || '#888';
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleContacto(editando.color, editando.index, c.contacto_id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 10, background: seleccionado ? '#1e3a2a' : '#252525', border: `1px solid ${seleccionado ? bg : '#333'}`, cursor: 'pointer' }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                        {(c.nombre || 'S').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 14 }}>{c.nombre || 'Sin nombre'}</span>
                      <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', border: `2px solid ${seleccionado ? bg : '#444'}`, background: seleccionado ? bg : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>
                        {seleccionado && '✓'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditando(null)}
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
                    Contactos que reciben esta alerta
                  </p>
                  {contactos.length === 0 ? (
                    <p style={{ color: '#555', fontSize: 13 }}>Todavía no tenés contactos. ¡Invitá a alguien!</p>
                  ) : (
                    contactos.map(c => {
                      const seleccionado = config.rojo.contactos.includes(c.contacto_id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleContacto('rojo', 0, c.contacto_id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: seleccionado ? '#3a1a1a' : '#1a1a1a', border: `1px solid ${seleccionado ? '#e74c3c' : '#2a2a2a'}`, cursor: 'pointer' }}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                            {(c.nombre || 'S').charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 14 }}>{c.nombre || 'Sin nombre'}</span>
                          <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', border: `2px solid ${seleccionado ? '#e74c3c' : '#444'}`, background: seleccionado ? '#e74c3c' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>
                            {seleccionado && '✓'}
                          </div>
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
                            onClick={() => { setEditando({ color: key, index: i }); setTextoEdit(msg); }}
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