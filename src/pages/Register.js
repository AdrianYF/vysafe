import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import '../styles/Auth.css';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, celular }
      }
    });

    if (error) {
      setError('Error al registrarse. Intentá de nuevo.');
    } else {
      setMensaje('Te mandamos un mail de verificación. Revisá tu bandeja.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1 className="auth-title">VySafe</h1>
        <p className="auth-subtitle">Creá tu cuenta</p>

        {mensaje ? (
          <div className="auth-success">
            <p>{mensaje}</p>
            <p className="auth-link" onClick={() => navigate('/')}>
              Ir al login
            </p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="auth-form">
            <input
              type="text"
              placeholder="Tu nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="auth-input"
              required
            />
            <input
              type="email"
              placeholder="Tu email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
              required
            />
            <input
              type="tel"
              placeholder="Tu celular"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className="auth-input"
              required
            />
            <input
              type="password"
              placeholder="Elegí una contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
              required
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        )}

        <p className="auth-link" onClick={() => navigate('/')}>
          ¿Ya tenés cuenta? Entrá
        </p>
      </div>
    </div>
  );
}

export default Register;