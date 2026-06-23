// Mock del buró de crédito (mainframe IBM Z, API SOAP).
// Simula el comportamiento descrito en BASE-GUIDE (contexto a):
//   - latencia de 8-15s
//   - límite de ~10 consultas/segundo
//   - fallos intermitentes
// Sirve para ejercitar el circuit breaker de scoring-svc.
// Solo usa módulos nativos de Node (sin dependencias → imagen liviana).
const http = require('node:http');

const PORT = process.env.PORT || 9101;

let windowStart = Date.now();
let countThisSecond = 0;
const RATE_LIMIT = 10;

function rateLimited() {
  const now = Date.now();
  if (now - windowStart >= 1000) {
    windowStart = now;
    countThisSecond = 0;
  }
  countThisSecond += 1;
  return countThisSecond > RATE_LIMIT;
}

function randomLatencyMs() {
  // 8000–15000 ms como indica el contexto adicional
  return 8000 + Math.floor(Math.random() * 7000);
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ service: 'bureau-soap-mock', status: 'ok' }));
  }

  // Endpoint que simula la operación SOAP de consulta de buró.
  if (req.method === 'POST' && req.url.startsWith('/soap/credit-report')) {
    if (rateLimited()) {
      res.writeHead(429, { 'Content-Type': 'text/xml' });
      return res.end('<soap:Fault>Rate limit exceeded (10 rps)</soap:Fault>');
    }
    // 15% de fallos intermitentes para ejercitar el circuit breaker
    if (Math.random() < 0.15) {
      res.writeHead(503, { 'Content-Type': 'text/xml' });
      return res.end('<soap:Fault>Mainframe unavailable</soap:Fault>');
    }
    const delay = randomLatencyMs();
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(
        `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <CreditReport>
      <hasFile>true</hasFile>
      <bureauScore>640</bureauScore>
      <activeDebts>2</activeDebts>
      <delinquencies>0</delinquencies>
      <latencyMs>${delay}</latencyMs>
    </CreditReport>
  </soap:Body>
</soap:Envelope>`,
      );
    }, delay);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => console.log(`bureau-soap-mock escuchando en :${PORT}`));
