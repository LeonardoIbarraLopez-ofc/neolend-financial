import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import BorrowerPortal from './components/BorrowerPortal';
import ComplianceConsole from './components/ComplianceConsole';
import InvestorPortal from './components/InvestorPortal';
import AnalystConsole from './components/AnalystConsole';
import CollectionsConsole from './components/CollectionsConsole';
import { NeoLendDatabase } from './mockData';
import { LoanApplication, EventLog, InvestorMetrics } from './types';
import { Sparkles, Shield, User, Landmark, Cpu, CreditCard, RotateCcw, ArrowRight, ArrowLeft, Home, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

// Loaded from environment variables (.env) or fallback to sandbox defaults
const API_BASE = import.meta.env.VITE_API_BASE || '/v1';
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:8101';
const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8105';

const PERFILES = [
  { rol: 'Solicitante', ruta: '/app', desc: 'Pedir crédito en < 3 min subiendo solo el documento', color: 'from-emerald-500 to-teal-600', icon: User, tag: 'Borrower' },
  { rol: 'Analista de Riesgo', ruta: '/analyst', desc: 'Revisar score + SHAP y resolver cola manual', color: 'from-indigo-500 to-purple-600', icon: Cpu, tag: 'Risk Analyst' },
  { rol: 'Inversionista Portal', ruta: '/investor', desc: 'Métricas de cartera en tiempo real', color: 'from-sky-500 to-blue-600', icon: Landmark, tag: 'Investor' },
  { rol: 'Servicing & Cobros', ruta: '/collections', desc: 'Gestionar casos de mora y acuerdos', color: 'from-amber-500 to-orange-600', icon: CreditCard, tag: 'Collections' },
  { rol: 'Cumplimiento / Auditor', ruta: '/compliance', desc: 'Auditoría de firmas JWS e inmutabilidad de eventos ledger', color: 'from-cyan-500 to-teal-500', icon: Shield, tag: 'Compliance' },
];

export default function App() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Load from mock database on mount & refresh
  useEffect(() => {
    refreshDB();
  }, [location.pathname]);

  const refreshDB = () => {
    setApplications(NeoLendDatabase.getApplications());
    setEvents(NeoLendDatabase.getEvents());
  };

  const handleReset = () => {
    if (window.confirm('¿Seguro que deseas reiniciar la simulación? Se borrarán las solicitudes añadidas.')) {
      NeoLendDatabase.clearAll();
      refreshDB();
      navigate('/');
    }
  };

  // Dynamically compute metrics for the investor portal based on current active applications
  const computeInvestorMetrics = (): InvestorMetrics => {
    const active = applications.filter(a => a.status === 'approved_auto');
    const outstanding = active.reduce((sum, a) => sum + a.requestAmount, 0);

    const months = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const flujoCajaProyectado = months.map((m, index) => {
      const factor = 1 + index * 0.15;
      return {
        month: m,
        inflow: Math.round(outstanding * 0.28 * factor),
        outflow: Math.round(outstanding * 0.18 * factor)
      };
    });

    // Delinquency dynamic calculation
    let par30 = 2.4;
    let par90 = 0.8;
    const restructureEvents = events.filter(e => e.eventType === 'credit.restructured');
    if (restructureEvents.length > 0) {
      par30 = Math.max(0.5, par30 - restructureEvents.length * 0.5);
      par90 = Math.max(0.1, par90 - restructureEvents.length * 0.2);
    }

    return {
      irr: Math.max(8.0, 14.8 + (active.length * 0.2) - (applications.filter(a => a.status === 'rejected').length * 0.5)),
      par30,
      par90,
      outstandingPrincipal: outstanding || 2500, // fallback min
      delinquencyBySegment: {
        A: Math.max(0.1, 0.6 - restructureEvents.length * 0.1),
        B: Math.max(0.3, 1.4 - restructureEvents.length * 0.2),
        C: Math.max(0.8, 3.2 - restructureEvents.length * 0.4),
        D: Math.max(2.0, 8.5 - restructureEvents.length * 0.8)
      },
      flujoCajaProyectado
    };
  };

  // Shared Header for dashboard pages
  const renderDashboardHeader = (title: string, roleColor: string) => {
    return (
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-200">
                <Home className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                NeoLend
              </span>
            </Link>
            <span className="text-slate-350">/</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border bg-slate-50 ${roleColor}`}>
              {title}
            </span>
          </div>

          {/* Quick jump navigation inside active workspace */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {PERFILES.map(p => {
                const isSelected = location.pathname === p.ruta;
                return (
                  <Link
                    key={p.rol}
                    to={p.ruta}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-150 ${
                      isSelected
                        ? 'bg-white shadow-sm text-slate-800'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p.rol.split(' ')[0]}
                  </Link>
                );
              })}
            </div>
            
            <button
              onClick={handleReset}
              className="text-slate-400 hover:text-rose-600 p-2 rounded-lg border border-slate-200 hover:bg-rose-50 transition cursor-pointer"
              title="Reiniciar Simulación"
            >
              <RotateCcw className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </header>
    );
  };

  const networkSettings = {
    isRealNetwork: true,
    gatewayUrl: GATEWAY_URL,
    originationUrl: `${GATEWAY_URL}${API_BASE}`
  };

  return (
    <Routes>
      {/* Root Path - Modern Glassmorphism Landing Page */}
      <Route
        path="/"
        element={
          <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden">
            {/* Ambient Background Circles */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 flex-1 flex flex-col justify-center z-10">
              {/* Logo & Headline */}
              <div className="text-center space-y-4 mb-16">
                <div className="inline-flex items-center gap-2.5 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-semibold text-teal-400">
                  <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
                  Plataforma FinTech de Crédito Digital
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-none">
                  NeoLend <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-400 bg-clip-text text-transparent">Financial Corp.</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium">
                  Entorno local orquestado con microservicios. Selecciona un perfil de usuario para operar la plataforma en tiempo real.
                </p>
              </div>

              {/* Grid of Profile Access Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PERFILES.map((p) => {
                  const Icon = p.icon;
                  return (
                    <motion.div
                      key={p.rol}
                      whileHover={{ y: -6, scale: 1.02 }}
                      className="bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300 shadow-xl"
                    >
                      <div className="space-y-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white shadow-md`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-extrabold tracking-widest text-slate-500">{p.tag}</span>
                          <h3 className="text-base font-extrabold text-white mt-0.5">{p.rol}</h3>
                          <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">{p.desc}</p>
                        </div>
                      </div>
                      
                      <div className="mt-8 pt-4 border-t border-slate-850 flex items-center justify-between">
                        <code className="text-[10px] text-teal-400 font-mono bg-teal-950/40 px-2.5 py-1 rounded-md border border-teal-900/30">
                          {p.ruta}
                        </code>
                        <Link
                          to={p.ruta}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer"
                        >
                          Entrar
                          <ArrowRight className="w-3.5 h-3.5 text-slate-350" />
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Gateway Connection Sandbox Metadata Status Bar */}
              <div className="mt-12 bg-slate-900/40 backdrop-blur-sm border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-400">
                <div className="flex items-center gap-3">
                  <Activity className="w-4.5 h-4.5 text-teal-500 animate-pulse shrink-0" />
                  <div className="text-left leading-normal">
                    <div>Gateway Endpoint: <code className="text-teal-400 font-mono">{GATEWAY_URL}</code></div>
                    <div className="text-[10px] text-slate-500">API Proxy: <code className="font-mono text-slate-450">{API_BASE}</code> · WS URL: <code className="font-mono text-slate-450">{WS_URL}</code></div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-400 uppercase font-black tracking-wider">
                  <span>Solicitudes Locales: {applications.length}</span>
                  <span>Ledger Eventos: {events.length}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="py-6 text-center text-[10px] text-slate-600 font-semibold border-t border-slate-900/80 bg-slate-950/80">
              © 2026 NeoLend Financial Corp. · Hackatón Final · Arquitectura Dirigida por Eventos
            </footer>
          </div>
        }
      />

      {/* Profile Routes with dashboard rendering */}
      <Route
        path="/app"
        element={
          <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            <div>
              {renderDashboardHeader('Solicitante', 'text-emerald-700 border-emerald-250 bg-emerald-50/50')}
              <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <BorrowerPortal onApplicationCreated={refreshDB} networkSettings={networkSettings} />
              </main>
            </div>
            <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-medium">
              © 2026 NeoLend Financial Corp. · local-first
            </footer>
          </div>
        }
      />

      <Route
        path="/analyst"
        element={
          <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            <div>
              {renderDashboardHeader('Analista de Riesgo', 'text-indigo-700 border-indigo-250 bg-indigo-50/50')}
              <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <AnalystConsole applications={applications} onRefresh={refreshDB} />
              </main>
            </div>
            <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-medium">
              © 2026 NeoLend Financial Corp. · local-first
            </footer>
          </div>
        }
      />

      <Route
        path="/investor"
        element={
          <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            <div>
              {renderDashboardHeader('Inversionista Portal', 'text-sky-700 border-sky-250 bg-sky-50/50')}
              <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <InvestorPortal metrics={computeInvestorMetrics()} onRefresh={refreshDB} />
              </main>
            </div>
            <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-medium">
              © 2026 NeoLend Financial Corp. · local-first
            </footer>
          </div>
        }
      />

      <Route
        path="/collections"
        element={
          <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            <div>
              {renderDashboardHeader('Servicing & Cobros', 'text-amber-700 border-amber-250 bg-amber-50/50')}
              <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <CollectionsConsole applications={applications} onRefresh={refreshDB} />
              </main>
            </div>
            <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-medium">
              © 2026 NeoLend Financial Corp. · local-first
            </footer>
          </div>
        }
      />

      <Route
        path="/compliance"
        element={
          <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
            <div>
              {renderDashboardHeader('Cumplimiento / Auditor', 'text-cyan-700 border-cyan-250 bg-cyan-50/50')}
              <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                <ComplianceConsole applications={applications} events={events} networkSettings={networkSettings} />
              </main>
            </div>
            <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-medium">
              © 2026 NeoLend Financial Corp. · local-first
            </footer>
          </div>
        }
      />
    </Routes>
  );
}
