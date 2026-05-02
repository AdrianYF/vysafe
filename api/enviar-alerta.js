export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mensaje, contactos, color, url, tipo } = req.body;

  if (!contactos || contactos.length === 0) {
    return res.status(200).json({ ok: true, mensaje: 'Sin contactos' });
  }

  const sonidos = {
    verde: 'VySafe-Verde',
    amarillo: 'VySafe-Amarilla',
    rojo: 'VySafe-Roja',
  };

  const sonido = sonidos[color] || 'VySafe-Verde';
  const tagUnico = `vysafe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  const payload = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_external_user_ids: contactos,
    contents: { en: mensaje, es: mensaje },
    headings: { en: '🚨 VySafe', es: '🚨 VySafe' },
    android_sound: sonido,
    web_push_topic: tagUnico,
  };

  if (url) {
    payload.url = url;
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${process.env.ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const rows = contactos.map(usuarioId => ({
      usuario_id: usuarioId,
      mensaje,
      color: color || 'verde',
      tipo: tipo || 'alerta',
      leida: false,
    }));

    await fetch(`${supabaseUrl}/rest/v1/notificaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
  } catch (e) {
    console.error('Error guardando notificación:', e);
  }

  return res.status(200).json(data);
}