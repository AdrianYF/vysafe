import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../supabase';
import NavBar from '../components/NavBar';
import Contactos from './Contactos';
import MenuLateral from '../components/MenuLateral';
import '../styles/Home.css';

const mensajesPorColor = {
  verde: ['Llegué bien a destino', 'Estoy en lugar seguro', 'Todo tranquilo'],
  amarillo: ['Saliendo de casa', 'Subiendo al colectivo', 'Caminando, todo bien'],
};

function Home() {
  const [showMessages, setShowMessages] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [colorActual, setColorActual] = useState(null);
  const [redHolding, setRedHolding] = useState(false);
  const [redCountdown, setRedCountdown] = useState(3);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [msgProgress, setMsgProgress] = useState(0);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [espejado, setEspejado] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const [cerrarProgress, setCerrarProgress] = useState(0);
  const [contactos, setContactos] = useState([]);
  const redInterval = useRef(null);
  const msgTimer = useRef(null);
  const cerrarTimer = useRef(null);
  const overlayRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    cargarContactos();
  }, []);

  async function cargarContactos() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('usuario_id', user.id);
    if (!error) setContactos(data || []);
  }

  async function enviarAlerta(mensaje, tipoAlerta) {
    try {
      const contactosDestino = contactos
        .filter(c => {
          if (tipoAlerta === 'verde') return c.alerta_verde;
          if (tipoAlerta === 'amarillo') return c.alerta_amarilla;
          if (tipoAlerta === 'rojo') return c.alerta_roja;
          return true;
        })
        .map(c => c.contacto_id);

      if (contactosDestino.length === 0) return;

      await fetch('/api/enviar-alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje, contactos: contactosDestino }),
      });
    } catch (e) {
      console.error('Error enviando alerta:', e);
    }
  }

  const mostrarConfirmacion = (msg, tipoAlerta) => {
    enviarAlerta(msg, tipoAlerta);
    setConfirmacion(msg);
    setCerrarProgress(0);
    let progress = 0;
    cerrarTimer.current = setInterval(() => {
      progress += 100 / 50;
      setCerrarProgress(progress);
      if (progress >= 100) {
        clearInterval(cerrarTimer.current);
        setConfirmacion(null);
        setCerrarProgress(0);
      }
    }, 100);
  };

  const cerrarConfirmacion = () => {
    clearInterval(cerrarTimer.current);
    setConfirmacion(null);
    setCerrarProgress(0);
  };

  const abrirMensajes = (color) => {
    setColorActual(color);
    setMensajes(mensajesPorColor[color]);
    setShowMessages(true);
  };

  const iniciarRojo = () => {
    setRedHolding(true);
    setRedCountdown(3);
    progressRef.current = 0;
    if (overlayRef.current) overlayRef.current.style.opacity = 0;

    redInterval.current = setInterval(() => {
      progressRef.current += 100 / 30;
      const nuevoSegundo = Math.ceil(3 - (progressRef.current / 100) * 3);
      setRedCountdown(nuevoSegundo);

      if (overlayRef.current) {
        overlayRef.current.style.opacity = progressRef.current / 200;
      }

      if (progressRef.current >= 100) {
        clearInterval(redInterval.current);
        setRedHolding(false);
        setRedCountdown(3);
        progressRef.current = 0;
        if (overlayRef.current) overlayRef.current.style.opacity = 0;
        mostrarConfirmacion('🚨 Alerta de emergencia', 'rojo');
      }
    }, 100);
  };

  const cancelarRojo = () => {
    clearInterval(redInterval.current);
    setRedHolding(false);
    setRedCountdown(3);
    progressRef.current = 0;
    if (overlayRef.current) overlayRef.current.style.opacity = 0;
  };

  const seleccionarMensaje = (msg) => {
    setSelectedMsg(msg);
    setMsgProgress(0);
    let progress = 0;
    msgTimer.current = setInterval(() => {
      progress += 100 / 20;
      setMsgProgress(progress);
      if (progress >= 100) {
        clearInterval(msgTimer.current);
        setShowMessages(false);
        setSelectedMsg(null);
        setMsgProgress(0);
        mostrarConfirmacion(msg, colorActual);
      }
    }, 100);
  };

  const cancelarMensaje = () => {
    clearInterval(msgTimer.current);
    setSelectedMsg(null);
    setMsgProgress(0);
  };

  const lado = espejado ? 'left' : 'right';

  return (
    <div className="home-container">
      <div ref={overlayRef} className="red-overlay" />

      {redHolding && (
        <div className="red-countdown">
          <span>{redCountdown}</span>
        </div>
      )}

      <div className="header">
        <h1>VySafe</h1>
        <p>mantené tu red informada</p>
      </div>

      <button
        className="btn-espejo-home"
        style={{ [espejado ? 'right' : 'left']: 20 }}
        onClick={() => setEspejado(!espejado)}
      >
        {espejado ? '←' : '→'}
      </button>

      <button
        className="btn-menu-home"
        style={{ [espejado ? 'left' : 'right']: 20 }}
        onClick={() => setMostrarMenu(true)}
      >
        ☰
      </button>

      <div className="buttons-container" style={{ [lado]: 24 }}>
        <button className="btn-verde" onClick={() => abrirMensajes('verde')}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="7,12 10,15 17,9"/>
          </svg>
        </button>
        <button className="btn-amarillo" onClick={() => abrirMensajes('amarillo')}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="13"/>
            <circle cx="12" cy="16" r="1" fill="white"/>
          </svg>
        </button>
        <button
          className="btn-rojo"
          onMouseDown={iniciarRojo}
          onMouseUp={cancelarRojo}
          onMouseLeave={cancelarRojo}
          onTouchStart={iniciarRojo}
          onTouchEnd={cancelarRojo}
          onTouchCancel={cancelarRojo}
        >
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <circle cx="12" cy="17" r="1" fill="white"/>
          </svg>
        </button>
      </div>

      {showMessages && (
        <div className="modal-overlay" onClick={() => setShowMessages(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>¿Qué querés avisar?</h2>
            {mensajes.map((msg) => (
              colorActual === 'verde' ? (
                <button
                  key={msg}
                  className="btn-mensaje"
                  onClick={() => {
                    setShowMessages(false);
                    mostrarConfirmacion(msg, 'verde');
                  }}
                >
                  {msg}
                </button>
              ) : (
                <button
                  key={msg}
                  className="btn-mensaje"
                  onMouseDown={() => seleccionarMensaje(msg)}
                  onMouseUp={cancelarMensaje}
                  onTouchStart={() => seleccionarMensaje(msg)}
                  onTouchEnd={cancelarMensaje}
                >
                  <div
                    className="btn-mensaje-barra"
                    style={{ width: selectedMsg === msg ? `${msgProgress}%` : '0%' }}
                  />
                  <span style={{ position: 'relative', zIndex: 1 }}>{msg}</span>
                </button>
              )
            ))}
            <button className="btn-cancelar" onClick={() => setShowMessages(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {confirmacion && (
        <div className="confirmacion-overlay">
          <div className="confirmacion-modal">
            <p className="confirmacion-titulo">Tu alerta</p>
            <p className="confirmacion-mensaje">{confirmacion}</p>
            <p className="confirmacion-subtitulo">fue enviada a</p>
            <div className="confirmacion-contactos">
              {contactos.length === 0 ? (
                <p style={{ color: '#555', fontSize: 13 }}>Sin contactos aún</p>
              ) : (
                contactos.map((c) => (
                  <div key={c.id} className="confirmacion-avatar">
                    {(c.nombre || 'S').charAt(0).toUpperCase()}
                  </div>
                ))
              )}
            </div>
            <button className="btn-cerrar-confirmacion" onClick={cerrarConfirmacion}>
              <div
                className="btn-cerrar-barra"
                style={{ width: `${cerrarProgress}%` }}
              />
              <span style={{ position: 'relative', zIndex: 1 }}>Cerrar</span>
            </button>
          </div>
        </div>
      )}

      {mostrarInvitar && (
        <Contactos soloInvitar={true} onCerrar={() => setMostrarInvitar(false)} />
      )}

      {mostrarMenu && <MenuLateral onCerrar={() => setMostrarMenu(false)} />}

      <NavBar onInvitar={() => setMostrarInvitar(true)} espejado={espejado} />
    </div>
  );
}

export default Home;