export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mensaje, contactos } = req.body;

  if (!contactos || contactos.length === 0) {
    return res.status(200).json({ ok: true, mensaje: 'Sin contactos' });
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Key ${process.env.ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: process.env.ONESIGNAL_APP_ID,
      include_external_user_ids: contactos,
      contents: { en: mensaje, es: mensaje },
      headings: { en: '🚨 VySafe', es: '🚨 VySafe' },
    }),
  });

  const data = await response.json();
  return res.status(200).json(data);
}