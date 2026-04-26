import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import NavBar from '../components/NavBar';

export default function Notificaciones() {
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarPendientes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('invitaciones_mensaje')
      .select('*')
      .eq('contacto_id', user.id)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false });

    setPendientes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarPendientes();
  }, [cargarPendientes]);

  async function responder(id, estado) {
    await supabase
      .from('invitaciones_mensaje')
      .update({ estado })
      .eq('id', id);

    // Notificar al invitador
    const invitacion = pendientes.find(p => p.id === id);
    if (invitacion) {
      const emoji = estado === 'aceptado' ? '✅' : '❌';
      const accion = estado === 'aceptado' ? 'aceptó' : 'rechazó';
      await fetch('/api/enviar-alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: `${emoji} Tu contacto ${accion} ser parte del mensaje "${invitacion.mensaje_texto}"`,
          contactos: [invitacion.invitador_id],
          color: invitacion.color,
        }),
      });

      // Si aceptó, guardar en config_alertas
      if (estado === 'aceptado') {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: existente } = await supabase
          .from('config_alertas')
          .select('*')
          .eq('usuario_id', invitacion.invitador_id)
          .eq('color', invitacion.color)
          .eq('mensaje_index', invitacion.mensaje_index)
          .single();

        if (existente) {
          const contactosActuales = existente.contactos ? existente.contactos.split(',').filter(Boolean) : [];
          if (!contactosActuales.includes(user.id)) {
            contactosActuales.push(user.id);
            await supabase
              .from('config_alertas')
              .update({ contactos: contactosActuales.join(',') })
              .eq('id', existente.id);
          }
        }
      }
    }

    setPendientes(prev => prev.filter(p => p.id !== id));
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

      {pendientes.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#555' }}>
          <span style={{ fontSize: 48, marginBottom: 16 }}>🔔</span>
          <p style={{ fontSize: 16 }}>No tenés invitaciones pendientes</p>
        </div>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pendientes.map(inv => {
            const color = colores[inv.color] || '#888';
            return (
              <div key={inv.id} style={{ background: '#1a1a1a', border: `1px solid ${color}`, borderRadius: 16, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>Alerta {inv.color}</span>
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
      )}

      <NavBar />
    </div>
  );
}