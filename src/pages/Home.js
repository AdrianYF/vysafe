import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Contactos from './Contactos';
import '../styles/Home.css';

const mensajesPorColor = {
  verde: ['Llegué bien a destino', 'Estoy en lugar seguro', 'Todo tranquilo'],
  amarillo: ['Saliendo de casa', 'Subiendo al colectivo', 'Caminando, todo bien'],
};

function Home() {
  const [showMessages, setShowMessages] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [colorActual, setColorActual] = useState(null);
  const [redProgress, setRedProgress] = useState(0);
  const [redHolding, setRedHolding] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [msgProgress, setMsgProgress] = useState(0);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const redInterval = useRef(null);
  const msgTimer = useRef(null);
  const navigate = useNavigate();

  const abrirMensajes = (color) => {
    setColorActual(color);
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

  return (
    <div className="home-container">
      {redHolding && <div className="red-overlay" style={{ opacity: redProgress / 200 }} />}

      <div className="header">
        <h1>VySafe</h1>
        <p>mantené tu red informada</p>
      </div>

      <div className="buttons-container">
        <button className="btn-verde" onClick={() => abrirMensajes('verde')}>✔</button>
        <button className="btn-amarillo" onClick={() => abrirMensajes('amarillo')}>⚠</button>
        <button
          className="btn-rojo"
          onMouseDown={iniciarRojo}
          onMouseUp={cancelarRojo}
          onTouchStart={iniciarRojo}
          onTouchEnd={cancelarRojo}
        >
          {redHolding ? `${Math.round(redProgress)}%` : '▲'}
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

      <NavBar onInvitar={() => setMostrarInvitar(true)} />

    </div>
  );
}

export default Home;