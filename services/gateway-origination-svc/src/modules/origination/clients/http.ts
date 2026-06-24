import { CORRELATION_HEADER, ServiceUnavailable } from '@neolend/ts-common';

/**
 * Cliente HTTP mínimo (fetch nativo de Node 20) con timeout y propagación del
 * correlationId. Si el servicio destino no responde, lanza 503 (RFC7807).
 */
export async function postJson<T>(
  url: string,
  body: unknown,
  correlationId: string,
  timeoutMs = 30000,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [CORRELATION_HEADER]: correlationId },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw ServiceUnavailable(`${url} respondió ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw ServiceUnavailable(`${url} timeout tras ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
