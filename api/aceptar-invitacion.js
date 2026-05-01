export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { invitacionId, usuarioId, invitadorId, color, mensajeIndex, mensajeTexto } = req.body;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  };

  try {
    // 1. Actualizar estado de invitación
    await fetch(`${supabaseUrl}/rest/v1/invitaciones_mensaje?id=eq.${invitacionId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ estado: 'aceptado' }),
    });

    // 2. Buscar fila en config_alertas del invitador
    const buscarRes = await fetch(
      `${supabaseUrl}/rest/v1/config_alertas?usuario_id=eq.${invitadorId}&color=eq.${color}&mensaje_index=eq.${mensajeIndex}`,
      { method: 'GET', headers }
    );
    const filas = await buscarRes.json();

    if (filas && filas.length > 0) {
      const existente = filas[0];
      const contactosActuales = existente.contactos
        ? existente.contactos.split(',').filter(Boolean)
        : [];

      if (!contactosActuales.includes(usuarioId)) {
        contactosActuales.push(usuarioId);
        await fetch(`${supabaseUrl}/rest/v1/config_alertas?id=eq.${existente.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ contactos: contactosActuales.join(',') }),
        });
      }
    } else {
      // Crear fila nueva
      await fetch(`${supabaseUrl}/rest/v1/config_alertas`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          usuario_id: invitadorId,
          color,
          mensaje_index: mensajeIndex,
          mensaje_texto: mensajeTexto,
          contactos: usuarioId,
        }),
      });
    }

    // 3. Notificar al invitador
    await fetch(`${req.headers.origin || 'https://www.vysafe.com'}/api/enviar-alerta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: `✅ Tu contacto aceptó ser parte del mensaje "${mensajeTexto}"`,
        contactos: [invitadorId],
        color,
        tipo: 'respuesta_invitacion',
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Error aceptando invitación:', e);
    return res.status(500).json({ error: e.message });
  }
}