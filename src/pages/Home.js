import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../styles/Home.css';

function Home() {
  const [user, setUser] = useState(null); // eslint-disable-line
  const [activeColor, setActiveColor] = useState(null);
  const [showMessages, setShowMessages] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const navigate = useNavigate();
  let holdTimer = null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate('/');
      else setUser(data.user);
    });
  }, [navigate]);

  const mensajesPorColor = {
    verde: ['Llegué bien a destino', 'Estoy en lugar seguro', 'Todo tranquilo'],
    amarillo: ['Saliendo de casa', 'Subiendo al colectivo', 'Caminando, todo bien'],
  };

  const startHold = (color) => {
    setActiveColor(color);
    if (color === 'rojo') {
      holdTimer = setTimeout(() => {
        enviarAlerta('rojo', '🔴 EMERGENCIA - Necesito ayuda urgente');
      }, 3000);
    } else {
      holdTimer = setTimeout(() => {
        setMensajes(mensajesPorColor[color]);
        setShowMessages(true);
      }, 600);
    }
  };

  const endHold = () => {
    clearTimeout(holdTimer);
    setActiveColor(null);
  };

  const enviarAlerta = async (color, mensaje) => {
    setShowMessages(false);
    alert(`Alerta ${color} enviada: ${mensaje}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">VySafe</h1>
        <p className="home-subtitle">mantené tu red informada</p>
      </div>

      {showMessages && (
        <div className="messages-panel">
          <p className="messages-title">Elegí un mensaje</p>
          {mensajes.map((msg, i) => (
            <button key={i} className={`message-option ${activeColor}`} onClick={() => enviarAlerta(activeColor, msg)}>
              {msg}
            </button>
          ))}
          <button className="message-cancel" onClick={() => setShowMessages(false)}>Cancelar</button>
        </div>
      )}

      <div className="buttons-container">
        <div className="button-row">
          <span className="button-label">Todo bien</span>
          <button
            className={`alert-btn btn-green ${activeColor === 'verde' ? 'pressing' : ''}`}
            onMouseDown={() => startHold('verde')}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={() => startHold('verde')}
            onTouchEnd={endHold}
          >✓</button>
        </div>

        <div className="button-row">
          <span className="button-label">Atención</span>
          <button
            className={`alert-btn btn-yellow ${activeColor === 'amarillo' ? 'pressing' : ''}`}
            onMouseDown={() => startHold('amarillo')}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={() => startHold('amarillo')}
            onTouchEnd={endHold}
          >!</button>
        </div>

        <div className="button-row">
          <span className="button-label">Emergencia</span>
          <button
            className={`alert-btn btn-red ${activeColor === 'rojo' ? 'pressing' : ''}`}
            onMouseDown={() => startHold('rojo')}
            onMouseUp={endHold}
            onMouseLeave={endHold}
            onTouchStart={() => startHold('rojo')}
            onTouchEnd={endHold}
          >▲</button>
        </div>
      </div>

      <nav className="bottom-nav">
        <button className="nav-item active">Inicio</button>
        <button className="nav-item">Contactos</button>
        <button className="nav-item">Invitar</button>
        <button className="nav-item">Alertas</button>
        <button className="nav-item" onClick={handleLogout}>Salir</button>
      </nav>
    </div>
  );
}

export default Home;