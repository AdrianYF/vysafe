import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORES_PLATAFORMA = {
  'chrome': '#4285F4',
  'safari': '#FF9500',
  'pwa-android': '#2ecc71',
  'pwa-ios': '#e74c3c',
};

const COLORES_ALERTA = {
  verde: '#2ecc71',
  amarillo: '#f39c12',
  rojo: '#e74c3c',
};

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('30d'); // '7d', '30d', '90d', 'todo'

  // Datos
  const [usuariosPorMes, setUsuariosPorMes] = useState([]);
  const [alertasPorMes, setAlertasPorMes] = useState([]);
  const [datosPlataforma, setDatosPlataforma] = useState([]);
  const [datosTorta, setDatosTorta] = useState([]);
  const [heatmapHoras, setHeatmapHoras] = useState([]);
  const [statsUbicacion, setStatsUbicacion] = useState({ con: 0, sin: 0, clics: 0 });
  const [promedioMensajes, setPromedioMensajes] = useState({ verde: 0, amarillo: 0 });

  function getFechaDesde() {
    const ahora = new Date();
    if (filtro === '7d') return new Date(ahora - 7 * 86400000).toISOString();
    if (filtro === '30d') return new Date(ahora - 30 * 86400000).toISOString();
    if (filtro === '90d') return new Date(ahora - 90 * 86400000).toISOString();
    return null;
  }

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    const desde = getFechaDesde();

    // 1. Usuarios por mes (de auth.users via perfiles)
    const { data: perfiles } = await supabase
      .from('perfiles')
      .select('created_at')
      .order('created_at', { ascending: true });

    const usuariosMes = {};
    (perfiles || []).forEach(p => {
      const mes = p.created_at.substring(0, 7); // YYYY-MM
      usuariosMes[mes] = (usuariosMes[mes] || 0) + 1;
    });

    // Acumulado
    let acum = 0;
    const usuariosMesData = Object.entries(usuariosMes).map(([mes, cant]) => {
      acum += cant;
      return { mes, nuevos: cant, total: acum };
    });
    setUsuariosPorMes(usuariosMesData);

    // 2. Plataformas
    let queryPlat = supabase.from('sesiones').select('plataforma, created_at');
    if (desde) queryPlat = queryPlat.gte('created_at', desde);
    const { data: sesiones } = await queryPlat;

    const platCount = {};
    (sesiones || []).forEach(s => {
      platCount[s.plataforma] = (platCount[s.plataforma] || 0) + 1;
    });
    setDatosPlataforma(Object.entries(platCount).map(([name, value]) => ({ name, value })));

    // 3. Alertas por mes
    let queryAlertas = supabase.from('alertas_enviadas').select('color, created_at');
    if (desde) queryAlertas = queryAlertas.gte('created_at', desde);
    const { data: alertas } = await queryAlertas;

    const alertasMes = {};
    (alertas || []).forEach(a => {
      const mes = a.created_at.substring(0, 7);
      if (!alertasMes[mes]) alertasMes[mes] = { mes, verde: 0, amarillo: 0, rojo: 0 };
      alertasMes[mes][a.color] = (alertasMes[mes][a.color] || 0) + 1;
    });
    setAlertasPorMes(Object.values(alertasMes).sort((a, b) => a.mes.localeCompare(b.mes)));

    // 4. Heatmap horario
    const horas = Array.from({ length: 24 }, (_, i) => ({ hora: `${i}h`, cantidad: 0 }));
    (alertas || []).forEach(a => {
      const hora = new Date(a.created_at).getHours();
      horas[hora].cantidad += 1;
    });
    setHeatmapHoras(horas);

    // 5. Ubicación stats
    const conUbicacion = (alertas || []).filter(a => a.latitud !== null).length;
    const sinUbicacion = (alertas || []).filter(a => a.latitud === null).length;

    let queryEventos = supabase.from('eventos').select('tipo').eq('tipo', 'ver_ubicacion');
    if (desde) queryEventos = queryEventos.gte('created_at', desde);
    const { data: eventos } = await queryEventos;
    setStatsUbicacion({ con: conUbicacion, sin: sinUbicacion, clics: (eventos || []).length });

    // 6. Torta usuarios
    const { data: todosPerfiles } = await supabase.from('perfiles').select('id');
    const { data: configData } = await supabase.from('config_alertas').select('usuario_id, contactos');

    const usuariosConContactos = new Set(
      (configData || []).filter(c => c.contactos && c.contactos.length > 0).map(c => c.usuario_id)
    );

    const totalUsuarios = (todosPerfiles || []).length;
    const conContactos = usuariosConContactos.size;
    const sinContactos = totalUsuarios - conContactos;

    setDatosTorta([
      { name: 'Con contactos', value: conContactos },
      { name: 'Sin contactos', value: sinContactos },
    ]);

    // 7. Promedio mensajes por color
    const { data: configMensajes } = await supabase
      .from('config_alertas')
      .select('usuario_id, color, mensaje_index')
      .in('color', ['verde', 'amarillo']);

    const porUsuarioColor = {};
    (configMensajes || []).forEach(row => {
      const key = `${row.usuario_id}-${row.color}`;
      porUsuarioColor[key] = (porUsuarioColor[key] || 0) + 1;
    });

    const promsVerde = Object.entries(porUsuarioColor)
      .filter(([k]) => k.endsWith('-verde'))
      .map(([, v]) => v);
    const promsAmarillo = Object.entries(porUsuarioColor)
      .filter(([k]) => k.endsWith('-amarillo'))
      .map(([, v]) => v);

    setPromedioMensajes({
      verde: promsVerde.length ? (promsVerde.reduce((a, b) => a + b, 0) / promsVerde.length).toFixed(1) : 0,
      amarillo: promsAmarillo.length ? (promsAmarillo.reduce((a, b) => a + b, 0) / promsAmarillo.length).toFixed(1) : 0,
    });

    setLoading(false);
  }, [filtro]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const tarjeta = (titulo, valor, subtitulo, color = '#fff') => (
    <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, flex: 1, minWidth: 140 }}>
      <p style={{ margin: 0, fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>{titulo}</p>
      <p style={{ margin: '8px 0 4px', fontSize: 32, fontWeight: 700, color }}>{valor}</p>
      {subtitulo && <p style={{ margin: 0, fontSize: 12, color: '#555' }}>{subtitulo}</p>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: 'sans-serif', padding: 24, paddingBottom: 60 }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📊 Dashboard</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#555' }}>VySafe Admin</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['7d', '30d', '90d', 'todo'].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: filtro === f ? '#2ecc71' : '#1a1a1a', color: filtro === f ? '#fff' : '#888', fontSize: 13, cursor: 'pointer', fontWeight: filtro === f ? 600 : 400 }}
            >
              {f === 'todo' ? 'Todo' : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#555' }}>
          <p>Cargando datos...</p>
        </div>
      ) : (
        <>
          {/* Tarjetas resumen */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
            {tarjeta('Usuarios totales', datosTorta[0]?.value + datosTorta[1]?.value || 0, 'registrados')}
            {tarjeta('Con contactos', datosTorta[0]?.value || 0, 'tienen red armada', '#2ecc71')}
            {tarjeta('Sin contactos', datosTorta[1]?.value || 0, 'red vacía', '#e74c3c')}
            {tarjeta('Clics ubicación', statsUbicacion.clics, 'veces abrieron el mapa', '#3498db')}
          </div>

          {/* Usuarios por mes */}
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>👥 Usuarios nuevos por mes</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={usuariosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="mes" stroke="#555" fontSize={12} />
                <YAxis stroke="#555" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#2ecc71" name="Total acumulado" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="nuevos" stroke="#3498db" name="Nuevos ese mes" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Plataformas */}
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📱 Sesiones por plataforma</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={datosPlataforma}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" stroke="#555" fontSize={12} />
                <YAxis stroke="#555" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                <Bar dataKey="value" name="Sesiones" radius={[6, 6, 0, 0]}>
                  {datosPlataforma.map((entry, index) => (
                    <Cell key={index} fill={COLORES_PLATAFORMA[entry.name] || '#888'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alertas por mes */}
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🚨 Alertas por mes</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={alertasPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="mes" stroke="#555" fontSize={12} />
                <YAxis stroke="#555" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="verde" fill={COLORES_ALERTA.verde} name="Verde" radius={[4, 4, 0, 0]} />
                <Bar dataKey="amarillo" fill={COLORES_ALERTA.amarillo} name="Amarillo" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rojo" fill={COLORES_ALERTA.rojo} name="Rojo" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap horario */}
          <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🕐 Horario de alertas</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={heatmapHoras}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="hora" stroke="#555" fontSize={10} />
                <YAxis stroke="#555" fontSize={12} />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                <Bar dataKey="cantidad" fill="#f39c12" name="Alertas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Torta usuarios + Ubicación + Promedio mensajes */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>

            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, flex: 1, minWidth: 260 }}>
              <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🧑‍🤝‍🧑 Red de usuarios</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={datosTorta} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                    <Cell fill="#2ecc71" />
                    <Cell fill="#e74c3c" />
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, flex: 1, minWidth: 260 }}>
              <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>📍 Ubicación</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#252525', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, color: '#ccc' }}>Con ubicación</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#2ecc71' }}>{statsUbicacion.con}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#252525', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, color: '#ccc' }}>Sin ubicación</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#e74c3c' }}>{statsUbicacion.sin}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#252525', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, color: '#ccc' }}>Clics en mapa</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#3498db' }}>{statsUbicacion.clics}</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: 16, padding: 20, flex: 1, minWidth: 260 }}>
              <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>✉️ Promedio mensajes por usuario</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#252525', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, color: '#ccc' }}>🟢 Verde</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#2ecc71' }}>{promedioMensajes.verde}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#252525', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, color: '#ccc' }}>🟡 Amarillo</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: '#f39c12' }}>{promedioMensajes.amarillo}</span>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}