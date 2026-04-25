import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function Unirse() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [estado, setEstado] = useState('cargando');
  const [invitador, setInvitador] = useState(null);
  const [nombreInvitador, setNombreInvitador] = useState('');
  const [sessionActiva, setSessionActiva] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [esPermanente, setEsPermanente] = useState(false);

  const verificarToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSessionActiva(session);

    // Primero buscar en perfiles (link permanente)
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('id, invite_token')
      .eq('invite_token', token)
      .maybeSingle();

    if (perfil) {
      setInvitador({ invitador_id: perfil.id });
      setEsPermanente(true);

      // Buscar nombre del invitador
      const { data: contactoData } = await supabase
        .from('contactos')
        .select('nombre, avatar_url')
        .eq('usuario_id', perfil.id)
        .limit(1)
        .maybeSingle();

      if (contactoData?.nombre) setNombreInvitador(contactoData.nombre);
      setEstado('valido');
      return;
    }

    // Si no es permanente, buscar en invitaciones
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
      setEstado(session ? 'ya_aceptado' : 'usado');
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setEstado('expirado');
      return;
    }

    setInvitador(data);
    setEstado('valido');
  }, [token]);

  useEffect(() => {
    verificarToken();
  }, [verificarToken]);

  async function aceptarInvitacion() {
    if (procesando) return;
    setProcesando(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate(`/register?redirect=/unirse/${token}`);
      return;
    }

    const user = session.user;
    const invitadorId = invitador.invitador_id || invitador.invitador_id;

    // Evitar que alguien se agregue a sí mismo
    if (user.id === invitadorId) {
      setProcesando(false);
      navigate('/home');
      return;
    }

    // Verificar duplicados
    const { data: yaExiste } = await supabase
      .from('contactos')
      .select('id')
      .eq('usuario_id', invitadorId)
      .eq('contacto_id', user.id)
      .maybeSingle();

    if (yaExiste) {
      setEstado('ya_aceptado');
      setProcesando(false);
      return;
    }

    const nombreUsuario = user.user_metadata?.full_name || user.user_metadata?.nombre || user.email;
    const avatarUsuario = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    // Insertar en la cuenta del invitador
    await supabase.from('contactos').insert({
      usuario_id: invitadorId,
      contacto_id: user.id,
      nombre: nombreUsuario,
      avatar_url: avatarUsuario,
      tipo: 'alerta',
      alerta_verde: true,
      alerta_amarilla: true,
      alerta_roja: true,
    });

    // Insertar espejo
    const { data: yaExisteEspejo } = await supabase
      .from('contactos')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('contacto_id', invitadorId)
      .maybeSingle();

    if (!yaExisteEspejo) {
      await supabase.from('contactos').insert({
        usuario_id: user.id,
        contacto_id: invitadorId,
        nombre: nombreInvitador || 'Contacto VySafe',
        avatar_url: null,
        tipo: 'alerta',
        alerta_verde: true,
        alerta_amarilla: true,
        alerta_roja: true,
      });
    }

    // Solo marcar como usado si NO es permanente
    if (!esPermanente) {
      await supabase
        .from('invitaciones')
        .update({ usado: true })
        .eq('token', token);
    }

    // Notificar al invitador
    try {
      const mensaje = `✅ ${nombreUsuario} aceptó tu invitación y ahora es tu contacto en VySafe`;
      await fetch('/api/enviar-alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, contactos: [invitadorId] }),
      });
    } catch (e) {
      console.error('Error enviando notificación:', e);
    }

    setEstado('aceptado');
    setProcesando(false);
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
    cursor: procesando ? 'not-allowed' : 'pointer',
    marginTop: '8px',
    width: '100%',
    opacity: procesando ? 0.6 : 1,
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
    width: '100%',
  };

  if (estado === 'cargando') return (
    <div style={estiloContainer}><p>Verificando invitación...</p></div>
  );

  if (estado === 'usado') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>🔒</span>
      <p>Este link ya fue usado.</p>
      <button style={estiloBtn} onClick={() => navigate('/')}>Ir a VySafe</button>
    </div>
  );

  if (estado === 'ya_aceptado') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>✅</span>
      <p style={{ fontSize: 20, fontWeight: 700 }}>¡Ya sos contacto!</p>
      <p style={{ color: '#888' }}>Esta invitación ya fue aceptada.</p>
      <button style={estiloBtn} onClick={() => navigate('/home')}>Ir a VySafe</button>
    </div>
  );

  if (estado === 'expirado') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>⏰</span>
      <p>Este link expiró.</p>
      <button style={estiloBtn} onClick={() => navigate('/')}>Ir a VySafe</button>
    </div>
  );

  if (estado === 'error') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>❌</span>
      <p>Link inválido.</p>
      <button style={estiloBtn} onClick={() => navigate('/')}>Ir a VySafe</button>
    </div>
  );

  if (estado === 'aceptado') return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>🎉</span>
      <p style={{ fontSize: 20, fontWeight: 700 }}>¡Te uniste!</p>
      <p style={{ color: '#888' }}>Ya sos parte de la red VySafe de tu contacto.</p>
      <button style={estiloBtn} onClick={() => navigate('/home')}>Abrir VySafe</button>
    </div>
  );

  return (
    <div style={estiloContainer}>
      <span style={{ fontSize: 48 }}>🤝</span>
      <p style={{ fontSize: 20, fontWeight: 700 }}>Te invitaron a VySafe</p>
      {nombreInvitador ? (
        <p style={{ color: '#aaa' }}>
          <strong style={{ color: '#fff' }}>{nombreInvitador}</strong> quiere mantenerte informado sobre su seguridad.
        </p>
      ) : (
        <p style={{ color: '#888' }}>Alguien quiere mantenerte informado sobre su seguridad.</p>
      )}
      <button style={estiloBtn} onClick={aceptarInvitacion} disabled={procesando}>
        {procesando ? 'Procesando...' : 'Aceptar invitación'}
      </button>
      {!sessionActiva && (
        <button style={estiloBtnSecundario} onClick={() => navigate(`/register?redirect=/unirse/${token}`)}>
          No tengo cuenta — Registrarme
        </button>
      )}
      {sessionActiva && (
        <p style={{ color: '#555', fontSize: 13 }}>
          Entrando como {sessionActiva.user?.user_metadata?.full_name || sessionActiva.user?.email}
        </p>
      )}
    </div>
  );
}