import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import NavBar from '../components/NavBar';

export default function Notificaciones() {
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalUbicacion, setModalUbicacion] = useState(null); // { lat, lng }

  const cargarDatos = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data: invitaciones } = await supabase
      .from('invitaciones_mensaje')
      .select('*')
      .eq('contacto_id', user.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    setPendientes(invitaciones || []);

    const { data: notifs } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setHistorial(notifs || []);

    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', user.id)
      .eq('leida', false);

    setLoading(false);
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  async function responder(id, estado) {
    const invitacion = pendientes.find(p => p.id === id);
    if (!invitacion) return;

    if (estado === 'aceptado') {
      const { data: { user } } = await supabase.auth.getUser();
      await fetch('/api/aceptar-invitacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitacionId: id,
          usuarioId: user.id,
          invitadorId: invitacion.invitador_id,
          color: invitacion.color,
          mensajeIndex: invitacion.mensaje_index,
          mensajeTexto: invitacion.mensaje_texto,
        }),
      });
    } else {
      await supabase
        .from('invitaciones_mensaje')
        .update({ estado: 'rechazado' })
        .eq('id', id);

      await fetch('/api/enviar-alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: `❌ Tu contacto rechazó ser parte del mensaje "${invitacion.mensaje_texto}"`,
          contactos: [invitacion.invitador_id],
          color: invitacion.color,
          tipo: 'respuesta_invitacion',
        }),
      });
    }

    setPendientes(prev => prev.filter(p => p.id !== id));
  }

  function formatFecha(fechaStr) {
    const fecha = new Date(fechaStr);
    const ahora = new Date();
    const diff = ahora - fecha;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `hace ${minutos} min`;
    if (horas < 24) return `hace ${horas}h`;
    if (dias < 7) return `hace ${dias}d`;
    return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  }

  // Extrae coordenadas del mensaje si tiene link de maps
  function extraerUbicacion(mensaje) {
    const match = mensaje.match(/https:\/\/maps\.google\.com\/\?q=([-\d.]+),([-\d.]+)/);
    if (match) {
      return { lat: match[1], lng: match[2] };
    }
    return null;
  }

  // Devuelve el mensaje sin el link de maps
  function limpiarMensaje(mensaje) {
    return mensaje.replace(/\s*📍\s*https:\/\/maps\.google\.com\/\?q=[-\d.,]+/g, '').trim();
  }

  function abrirEnGoogleMaps(lat, lng) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    setModalUbicacion(null);
  }

  function abrirEnWaze(lat, lng) {
    window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank');
    setModalUbicacion(null);
  }

  function abrirEnNavegador(lat, lng) {
    window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank');
    setModalUbicacion(null);
  }

  const colores = {
    verde: '#2ecc71',
    amarillo: '#f39c12',
    rojo: '#e74c3c',
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <p>Cargando...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', fontFamily: 'sans-serif', color: '#fff', paddingBottom: 100 }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 20px 10px', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontSize: 18, fontWeight: 600 }}>🔔 Alertas</span>
      </div>

      {/* Modal de ubicación */}
      {modalUbicacion && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setModalUbicacion(null)}
        >
          <div
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320 }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>📍 Ver ubicación</p>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'center' }}>¿Con qué app querés abrir la ubicación?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => abrirEnGoogleMaps(modalUbicacion.lat, modalUbicacion.lng)}
                style={{ padding: 12, borderRadius: 12, border: 'none', background: '#4285F4', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                🗺️ Google Maps
              </button>
              <button
                onClick={() => abrirEnWaze(modalUbicacion.lat, modalUbicacion.lng)}
                style={{ padding: 12, borderRadius: 12, border: 'none', background: '#33CCFF', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
              >
                🚗 Waze
              </button>
              <button
                onClick={() => abrirEnNavegador(modalUbicacion.lat, modalUbicacion.lng)}
                style={{ padding: 12, borderRadius: 12, border: '1px solid #333', background: 'transparent', color: '#888', fontSize: 14, cursor: 'pointer' }}
              >
                Abrir en el navegador
              </button>
              <button
                onClick={() => setModalUbicacion(null)}
                style={{ padding: 10, borderRadius: 12, border: '1px solid #333', background: 'transparent', color: '#555', fontSize: 13, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {pendientes.length > 0 && (
        <div style={{ padding: '16px 16px 0' }}>
          <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Invitaciones pendientes
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendientes.map(inv => {
              const color = colores[inv.color] || '#888';
              return (
                <div key={inv.id} style={{ background: '#1a1a1a', border: `1px solid ${color}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Alerta {inv.color}</span>
                    <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto' }}>{formatFecha(inv.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 15, color: '#fff', marginBottom: 4 }}>
                    Te invitaron a ser contacto del mensaje:
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 600, color, marginBottom: 16 }}>
                    "{inv.mensaje_texto}"
                  </p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => responder(inv.id, 'rechazado')}
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: '1px solid #e74c3c', background: 'transparent', color: '#e74c3c', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ❌ Rechazar
                    </button>
                    <button
                      onClick={() => responder(inv.id, 'aceptado')}
                      style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: '#2ecc71', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    >
                      ✅ Aceptar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {historial.length > 0 && (
        <div style={{ padding: 16 }}>
          {pendientes.length > 0 && (
            <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginTop: 8 }}>
              Historial
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historial.map(notif => {
              const color = colores[notif.color] || '#888';
              const ubicacion = extraerUbicacion(notif.mensaje);
              const mensajeLimpio = limpiarMensaje(notif.mensaje);
              return (
                <div key={notif.id} style={{ background: notif.leida ? '#111' : '#1a1a1a', border: `1px solid ${notif.leida ? '#1a1a1a' : color}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: notif.leida ? '#888' : '#fff', margin: 0 }}>{mensajeLimpio}</p>
                    {ubicacion && (
                      <button
                        onClick={() => setModalUbicacion(ubicacion)}
                        style={{ marginTop: 6, padding: '4px 10px', borderRadius: 8, border: `1px solid ${color}`, background: 'transparent', color: color, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        📍 Ver ubicación
                      </button>
                    )}
                    <p style={{ fontSize: 11, color: '#555', margin: '4px 0 0' }}>{formatFecha(notif.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pendientes.length === 0 && historial.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#555' }}>
          <span style={{ fontSize: 48, marginBottom: 16 }}>🔔</span>
          <p style={{ fontSize: 16 }}>No tenés notificaciones</p>
        </div>
      )}

      <NavBar />
    </div>
  );
}