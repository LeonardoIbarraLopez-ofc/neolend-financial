// Mock de billeteras digitales / bancos / corresponsales (desembolso, inciso IV).
// Acepta una orden de desembolso y responde con confirmación + referencia.
const http = require('node:http');

const PORT = process.env.PORT || 9102;

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
    return res.end(JSON.stringify({ service: 'wallet-mock', status: 'ok' }));
  }

  if (req.method === 'POST' && req.url.startsWith('/disburse')) {
    const body = await readBody(req);
    const ref = 'TX-' + Math.floor(Math.random() * 1e8);
    // 5% de fallos para probar reintentos
    const failed = Math.random() < 0.05;
    res.writeHead(failed ? 502 : 200, { 'Content-Type': 'application/json' });
    return res.end(
      JSON.stringify({
        status: failed ? 'FAILED' : 'COMPLETED',
        providerRef: failed ? null : ref,
        channel: body.channel || 'WALLET',
        amount: body.amount,
        settledAt: failed ? null : new Date().toISOString(),
      }),
    );
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => console.log(`wallet-mock escuchando en :${PORT}`));
