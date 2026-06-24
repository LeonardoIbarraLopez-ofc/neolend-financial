// Mock de proveedor omnicanal (WhatsApp / SMS / Email) para cobranza (inciso V).
// Acepta un envío y responde con id + estado de entrega.
const http = require('node:http');

const PORT = process.env.PORT || 9103;

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data ? JSON.parse(data) : {}));
  });
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ service: 'whatsapp-mock', status: 'ok' }));
  }

  if (req.method === 'POST' && req.url.startsWith('/send')) {
    const body = await readBody(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        providerRef: 'MSG-' + Math.floor(Math.random() * 1e8),
        channel: body.channel || 'WHATSAPP',
        status: 'DELIVERED',
        sentAt: new Date().toISOString(),
      }),
    );
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => console.log(`whatsapp-mock escuchando en :${PORT}`));
