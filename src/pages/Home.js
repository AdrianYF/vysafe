import React, { useState, useRef } from 'react';
import '../styles/Home.css';

function Home() {
  const [showMessages, setShowMessages] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [redProgress, setRedProgress] = useState(0);
  const [redHolding, setRedHolding] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [msgProgress, setMsgProgress] = useState(0);
  const holdTimer = useRef(null);
  const redInterval = useRef(null);
  const msgTimer = useRef(null);

  const mensajesPorColor = {
    verde: ['Llegué bien a destino', 'Estoy en lugar seguro', 'Todo tranquilo'],
    amarillo: ['Saliendo de casa', 'Subiendo al colectivo', 'Caminando, todo bien'],
  };

  const startHoldVerde = () => {
    setActiveColor('verde');
    holdTimer.current = setTimeout(() => {}, 0);
    enviarAlerta('verde', 'Todo bien');
  };

  const startHoldAmarillo = () => {
    setActiveColor('amarillo');
    setMensajes(mensajesPorColor.amarillo);
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
        enviarAlerta('amarillo', msg);
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
            <p className="messages-title">Elegí un mensaje</p>
            {mensajes.map((msg, i) => (
              <button
                key={i}
                className="message-option amarillo"
                onMouseDown={() => startMsgHold(msg)}
                onMouseUp={endMsgHold}
                onMouseLeave={endMsgHold}
                onTouchStart={() => startMsgHold(msg)}
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
          <span className="button-label">Todo bien</span>
          <button className="alert-btn btn-green" onClick={startHoldVerde}>✓</button>
        </div>

        <div className="button-row">
          <span className="button-label">Atención</span>
          <button className="alert-btn btn-yellow" onClick={startHoldAmarillo}>!</button>
        </div>

        <div className="button-row">
          <span className="button-label">Emergencia</span>
          <button
            className={`alert-btn btn-red ${redHolding ? 'pressing' : ''}`}
            onMouseDown={startHoldRojo}
            onMouseUp={endHoldRojo}
            onMouseLeave={endHoldRojo}
            onTouchStart={startHoldRojo}
            onTouchEnd={endHoldRojo}
          >▲</button>
        </div>
      </div>
    </div>
  );
}

export default Home;