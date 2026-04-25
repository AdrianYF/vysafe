import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Unirse() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando');
  const [invitacion, setInvitacion] = useState(null);
  const [nombreInvitador, setNombreInvitador] = useState('');

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

    // Buscar nombre del invitador
    const { data: userData } = await supabase
      .from('contactos')
      .select('nombre')
      .eq('contacto_id', data.invitador_id)
      .limit(1)
      .single();

    if (userData?.nombre) {
      setNombreInvitador(userData.nombre);
    } else {
      // Buscar en auth users por metadata
      const { data: authData } = await supabase.auth.admin?.getUserById?.(data.invitador_id);
      if (authData?.user?.user_metadata?.nombre) {
        setNombreInvitador(authData.user.user_metadata.nombre);
      }
    }

    setEstado('valido');
  }, [token]);

  useEffect(() => {
    verificarToken();
  }, [verificarToken]);

  async function aceptarInvitacion() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate(`/register?redirect=/unirse/${token}`);
      return;
    }

    const { error } = await supabase.from('contactos').insert({
      usuario_id: invitacion.invitador_id,
      contacto_id: user.id,
      nombre: user.user_metadata?.nombre || user.email,
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

      try {
        const nombre = user.user_metadata?.nombre || user.email;
        const mensaje = `✅ ${nombre} aceptó tu invitación y ahora es tu contacto en VySafe`;
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

  const estiloBtnSecundario = {
    padding: '14px 32px',
    borderRadius: '14px',
    border: '1px solid #333',
    background: 'transparent',
    color: '#888',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '4px',
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
      {nombreInvitador ? (
        <p style={{ color: '#aaa' }}><strong style={{ color: '#fff' }}>{nombreInvitador}</strong> quiere mantenerte informado sobre su seguridad.</p>
      ) : (
        <p style={{ color: '#888' }}>Alguien quiere mantenerte informado sobre su seguridad.</p>
      )}
      <button style={estiloBtn} onClick={aceptarInvitacion}>Aceptar invitación</button>
      <button style={estiloBtnSecundario} onClick={() => navigate(`/register?redirect=/unirse/${token}`)}>
        No tengo cuenta — Registrarme
      </button>
    </div>
  );
}