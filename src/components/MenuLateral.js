import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import './MenuLateral.css';

export default function MenuLateral({ onCerrar }) {
  const navigate = useNavigate();
  const [invitacionesPendientes, setInvitacionesPendientes] = useState(0);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      setUsuario(user);

      const { data } = await supabase
        .from('invitaciones_mensaje')
        .select('id')
        .eq('contacto_id', user.id)
        .eq('estado', 'pendiente');

      setInvitacionesPendientes(data?.length || 0);
    }
    cargar();
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    onCerrar();
    navigate('/');
  }

  function ir(ruta) {
    onCerrar();
    navigate(ruta);
  }

  const opciones = [
    {
      label: 'Mi red',
      icono: '🌐',
      badge: invitacionesPendientes,
      accion: () => ir('/notificaciones'),
    },
    {
      label: 'Mis contactos',
      icono: '👥',
      accion: () => ir('/contactos'),
    },
    {
      label: 'Mi perfil',
      icono: '👤',
      accion: null,
    },
    {
      label: 'Términos y condiciones',
      icono: '📄',
      accion: null,
    },
    {
      label: 'Política de privacidad',
      icono: '🔒',
      accion: null,
    },
    {
      label: 'Contactanos',
      icono: '✉️',
      accion: null,
    },
    {
      label: 'Cerrar sesión',
      icono: '🚪',
      accion: cerrarSesion,
      color: '#e74c3c',
    },
  ];

  return (
    <>
      <div className="menu-overlay" onClick={onCerrar} />
      <div className="menu-lateral">
        <div className="menu-header">
          <div>
            <div className="menu-titulo">VySafe</div>
            {usuario?.email && (
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{usuario.email}</div>
            )}
          </div>
          <button className="menu-cerrar" onClick={onCerrar}>✕</button>
        </div>
        <ul className="menu-lista">
          {opciones.map((op) => (
            <li
              key={op.label}
              className="menu-item"
              style={{ color: op.color || '#ccc', opacity: op.accion ? 1 : 0.5 }}
              onClick={op.accion || undefined}
            >
              <span className="menu-icono">{op.icono}</span>
              <span style={{ flex: 1 }}>{op.label}</span>
              {op.badge > 0 && (
                <span style={{
                  background: '#e74c3c',
                  color: '#fff',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {op.badge}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}