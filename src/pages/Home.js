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
  const [redProgress, setRedProgress] = useState(0);
  const [redHolding, setRedHolding] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [msgProgress, setMsgProgress] = useState(0);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [espejado, setEspejado] = useState(false);
  const [mostrarMenu, setMostrarMenu] = useState(false);
  const redInterval = useRef(null);
  const msgTimer = useRef(null);

  const abrirMensajes = (color) => {
    setMensajes(mensajesPorColor[color]);
    setShowMessages(true);
  };

  const iniciarRojo = () => {
    setRedHolding(true);
    setRedProgress(0);
    let progress = 0;
    redInterval.current = setInterval(() => {
      progress += 100 / 30;
      setRedProgress(progress);
      if (progress >= 100) {
        clearInterval(redInterval.current);
        setRedHolding(false);
        setRedProgress(0);
        alert('🚨 ¡Alerta roja enviada!');
      }
    }, 100);
  };

  const cancelarRojo = () => {
    clearInterval(redInterval.current);
    setRedHolding(false);
    setRedProgress(0);
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
        alert(`✅ Mensaje enviado: "${msg}"`);
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
      {redHolding && <div className="red-overlay" style={{ opacity: redProgress / 200 }} />}

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
          onTouchStart={iniciarRojo}
          onTouchEnd={cancelarRojo}
        >
          {redHolding ? `${Math.round(redProgress)}%` : (
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <circle cx="12" cy="17" r="1" fill="white"/>
            </svg>
          )}
        </button>
      </div>

      {showMessages && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>¿Qué querés avisar?</h2>
            {mensajes.map((msg) => (
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
            ))}
            <button className="btn-cancelar" onClick={() => setShowMessages(false)}>Cancelar</button>
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