import React, { useState, useRef } from 'react';
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
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [msgProgress, setMsgProgress] = useState(0);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [espejado, setEspejado] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const redInterval = useRef(null);
  const msgTimer = useRef(null);
  const overlayRef = useRef(null);
  const progressRef = useRef(0);

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const abrirMensajes = (color) => {
    setColorActual(color);
    setMensajes(mensajesPorColor[color]);
    setShowMessages(true);
  };

  const iniciarRojo = () => {
    setRedHolding(true);
    progressRef.current = 0;
    if (overlayRef.current) overlayRef.current.style.opacity = 0;
    redInterval.current = setInterval(() => {
      progressRef.current += 100 / 30;
      if (overlayRef.current) {
        overlayRef.current.style.opacity = progressRef.current / 200;
      }
      if (progressRef.current >= 100) {
        clearInterval(redInterval.current);
        setRedHolding(false);
        progressRef.current = 0;
        if (overlayRef.current) overlayRef.current.style.opacity = 0;
        mostrarToast('🚨 ¡Alerta roja enviada!');
      }
    }, 100);
  };

  const cancelarRojo = () => {
    clearInterval(redInterval.current);
    setRedHolding(false);
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
        mostrarToast(`✅ Mensaje enviado: "${msg}"`);
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
          {redHolding ? `${Math.round(progressRef.current)}%` : (
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <circle cx="12" cy="17" r="1" fill="white"/>
            </svg>
          )}
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
                    mostrarToast(`✅ Mensaje enviado: "${msg}"`);
                  }}
                >
                  {msg}
                </button>
              ) : (
                <button
                  key={msg}
                  className={`btn-mensaje ${selectedMsg === msg ? 'seleccionado' : ''}`}
                  onMouseDown={() => seleccionarMensaje(msg)}
                  onMouseUp={cancelarMensaje}
                  onTouchStart={() => seleccionarMensaje(msg)}
                  onTouchEnd={cancelarMensaje}
                >
                  {selectedMsg === msg ? `${Math.round(msgProgress)}%` : msg}
                </button>
              )
            ))}
            <button className="btn-cancelar" onClick={() => setShowMessages(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {mostrarInvitar && (
        <Contactos soloInvitar={true} onCerrar={() => setMostrarInvitar(false)} />
      )}

      {mostrarMenu && <MenuLateral onCerrar={() => setMostrarMenu(false)} />}
      {toast && <div className="toast">{toast}</div>}

      <NavBar onInvitar={() => setMostrarInvitar(true)} espejado={espejado} />
    </div>
  );
}

export default Home;