import React, { useState, useRef } from 'react';
import '../styles/Home.css';

function Home() {
  const [showMessages, setShowMessages] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [colorActual, setColorActual] = useState(null);
  const [redProgress, setRedProgress] = useState(0);
  const [redHolding, setRedHolding] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [msgProgress, setMsgProgress] = useState(0);
  const redInterval = useRef(null);
  const msgTimer = useRef(null);

  const mensajesPorColor = {
    verde: ['Llegué bien a destino', 'Estoy en lugar seguro', 'Todo tranquilo'],
    amarillo: ['Saliendo de casa', 'Subiendo al colectivo', 'Caminando, todo bien'],
  };

  const abrirMensajes = (color) => {
    setColorActual(color);
    setMensajes(mensajesPorColor[color]);
    setShowMessages(true);
  };

  const startHoldRojo = () => {
    setRedHolding(true);
    setRedProgress(0);
    let progress = 0;
    redInterval.current = setInterval(() => {
      progress += 100 / 30;
      setRedProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(redInterval.current);
        setRedHolding(false);
        setRedProgress(0);
        enviarAlerta('rojo', 'EMERGENCIA - Necesito ayuda urgente');
      }
    }, 100);
  };

  const endHoldRojo = () => {
    clearInterval(redInterval.current);
    setRedHolding(false);
    setRedProgress(0);
  };

  const startMsgHold = (msg) => {
    setSelectedMsg(msg);
    setMsgProgress(0);
    let progress = 0;
    msgTimer.current = setInterval(() => {
      progress += 100 / 20;
      setMsgProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(msgTimer.current);
        setShowMessages(false);
        setMsgProgress(0);
        setSelectedMsg(null);
        enviarAlerta(colorActual, msg);
      }
    }, 100);
  };

  const endMsgHold = () => {
    clearInterval(msgTimer.current);
    setMsgProgress(0);
    setSelectedMsg(null);
  };

  const enviarAlerta = async (color, mensaje) => {
    alert(`Alerta ${color}: ${mensaje}`);
  };

  return (
    <div className="home-container">
      {redHolding && (
        <div className="red-overlay" style={{ opacity: redProgress / 100 * 0.7 }}>
          <div className="red-countdown">
            <div className="red-countdown-number">{Math.ceil(3 - (redProgress / 100 * 3))}</div>
            <div className="red-countdown-text">Soltá para cancelar</div>
          </div>
        </div>
      )}

      {showMessages && (
        <div className="messages-overlay">
          <div className="messages-panel">
            <p className="messages-title">Mantené apretado para enviar</p>
            {mensajes.map((msg, i) => (
              <button
                key={i}
                className={`message-option ${colorActual}`}
                onMouseDown={() => startMsgHold(msg)}
                onMouseUp={endMsgHold}
                onMouseLeave={endMsgHold}
                onTouchStart={(e) => { e.preventDefault(); startMsgHold(msg); }}
                onTouchEnd={endMsgHold}
              >
                <span className="msg-text">{msg}</span>
                {selectedMsg === msg && (
                  <div className="msg-progress-bar" style={{ width: `${msgProgress}%` }} />
                )}
              </button>
            ))}
            <button className="message-cancel" onClick={() => setShowMessages(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="home-header">
        <h1 className="home-title">VySafe</h1>
        <p className="home-subtitle">mantené tu red informada</p>
      </div>

      <div className="buttons-container">
        <div className="button-row">
          <button className="alert-btn btn-green" onClick={() => abrirMensajes('verde')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
        <div className="button-row">
          <button className="alert-btn btn-yellow" onClick={() => abrirMensajes('amarillo')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="1" fill="white"/></svg>
          </button>
        </div>
        <div className="button-row">
          <button
            className={`alert-btn btn-red ${redHolding ? 'pressing' : ''}`}
            onMouseDown={startHoldRojo}
            onMouseUp={endHoldRojo}
            onMouseLeave={endHoldRojo}
            onTouchStart={(e) => { e.preventDefault(); startHoldRojo(); }}
            onTouchEnd={endHoldRojo}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="white"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;