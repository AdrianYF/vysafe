import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Contactos from './pages/Contactos';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) return <div>Cargando...</div>;

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={session ? <Navigate to="/home" /> : <Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={session ? <Home /> : <Navigate to="/" />} />
          <Route path="/contactos" element={session ? <Contactos /> : <Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;