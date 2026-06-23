/**
 * Baseline del frontend. El desarrollo completo (router, perfiles, capa api/,
 * pantallas) está especificado en docs/FRONTEND.md y se construye en Fase 1+.
 * Esta landing solo confirma que el scaffold de Vite arranca.
 */
const PERFILES = [
  { rol: 'Solicitante', ruta: '/app', desc: 'Pedir crédito en < 3 min subiendo solo el documento' },
  { rol: 'Analista', ruta: '/analyst', desc: 'Revisar score + SHAP y resolver cola manual' },
  { rol: 'Inversionista', ruta: '/investor', desc: 'Métricas de cartera en tiempo real' },
  { rol: 'Cobranza', ruta: '/collections', desc: 'Gestionar casos de mora y acuerdos' },
];

export default function App() {
  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 880, margin: '0 auto', padding: 24 }}>
      <h1>NeoLend Financial</h1>
      <p style={{ color: '#555' }}>
        Plataforma FinTech de Crédito Digital — entorno local. Scaffold inicial; las pantallas se
        implementan según <code>docs/FRONTEND.md</code>.
      </p>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {PERFILES.map((p) => (
          <article
            key={p.rol}
            style={{ border: '1px solid #e2e2e2', borderRadius: 12, padding: 16 }}
          >
            <h3 style={{ margin: '0 0 8px' }}>{p.rol}</h3>
            <p style={{ margin: '0 0 8px', color: '#666', fontSize: 14 }}>{p.desc}</p>
            <code style={{ fontSize: 12 }}>{p.ruta}</code>
          </article>
        ))}
      </section>
    </main>
  );
}
