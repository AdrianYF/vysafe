import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Unirse() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando');
  const [invitacion, setInvitacion] = useState(null);

  const verificarToken = useCallback(async () => {
    const { data, error } = await supabase
      .from('invitaciones')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      setEstado('error');
      return;
    }

    if (data.usado) {
      setEstado('usado');
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setEstado('expirado');
      return;
    }

    setInvitacion(data);
    setEstado('valido');
  }, [token]);

  useEffect(() => {
    verificarToken();
  }, [verificarToken]);

  async function aceptarInvitacion() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate(`/login?redirect=/unirse/${token}`);
      return;
    }

    const { error } = await supabase.from('contactos').insert({
      usuario_id: invitacion.invitador_id,
      contacto_id: user.id,
      nombre: user.email,
      tipo: invitacion.tipo,
      alerta_verde: invitacion.alerta_verde,
      alerta_amarilla: invitacion.alerta_amarilla,
      alerta_roja: invitacion.alerta_roja,
    });

    if (!error) {
      await supabase
        .from('invitaciones')
        .update({ usado: true })
        .eq('token', token);

      // Notificar al que invitó
      try {
        const mensaje = `✅ ${user.email} aceptó tu invitación y ahora es tu contacto en VySafe`;
        await fetch('/api/enviar-alerta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mensaje,
            contactos: [invitacion.invitador_id],
          }),
        });
      } catch (e) {
        console.error('Error enviando notificación:', e);
      }

      setEstado('aceptado');
    }
  }

  const estiloContainer = {
    minHeight: '100vh',
    background: '#0d0d0d',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    fontFamily: 'sans-serif',
    color: '#fff',
    textAlign: 'center',
    gap: '16px',
  };

  const estiloBtn = {
    padding: '14px 32px',
    borderRadius: '14px',
    border: 'none',
    background: '#2ecc71',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  };

  if (estado === 'cargando') return (
    <div style={estiloContainer}>
      <p>Verificando invitación...</p>
    </div>
  );

  if (estado === 'usado') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>🔒</span>
      <p>Este link ya fue usado.</p>
    </div>
  );

  if (estado === 'expirado') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>⏰</span>
      <p>Este link expiró.</p>
    </div>
  );

  if (estado === 'error') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>❌</span>
      <p>Link inválido.</p>
    </div>
  );

  if (estado === 'aceptado') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>🎉</span>
      <p style={{ fontSize: 20, fontWeight: 700 }}>¡Te uniste!</p>
      <p style={{ color: '#888' }}>Ya sos parte de la red VySafe de tu contacto.</p>
      <button style={estiloBtn} onClick={() => navigate('/home')}>Ir a VySafe</button>
    </div>
  );

  return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>🤝</span>
      <p style={{ fontSize: 20, fontWeight: 700 }}>Te invitaron a VySafe</p>
      <p style={{ color: '#888' }}>Alguien quiere mantenerte informado sobre su seguridad.</p>
      <button style={estiloBtn} onClick={aceptarInvitacion}>Aceptar invitación</button>
    </div>
  );
}