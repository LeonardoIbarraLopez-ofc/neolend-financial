import React, { useState, useEffect } from 'react';
import BorrowerPortal from './components/BorrowerPortal';
import ComplianceConsole from './components/ComplianceConsole';
import InvestorPortal from './components/InvestorPortal';
import AnalystConsole from './components/AnalystConsole';
import CollectionsConsole from './components/CollectionsConsole';
import { NeoLendDatabase } from './mockData';
import { LoanApplication, EventLog, InvestorMetrics } from './types';
import { Sparkles, Shield, User, Landmark, Cpu, CreditCard, RotateCcw } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'borrower' | 'analyst' | 'investor' | 'compliance' | 'collections'>('borrower');
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);

  // Load from mock database on mount
  useEffect(() => {
    refreshDB();
  }, []);

  const refreshDB = () => {
    setApplications(NeoLendDatabase.getApplications());
    setEvents(NeoLendDatabase.getEvents());
  };

  const handleReset = () => {
    if (window.confirm('¿Seguro que deseas reiniciar la simulación? Se borrarán las solicitudes añadidas.')) {
      NeoLendDatabase.clearAll();
      refreshDB();
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Banner Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Landmark className="w-6 h-6 text-teal-600" />
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              NeoLend Financial Corp.
            </span>
            <span className="hidden sm:inline bg-teal-50 text-teal-700 text-[10px] px-2 py-0.5 rounded-full font-bold border border-teal-100">
              Demo Sandbox (D1)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="text-slate-400 hover:text-slate-600 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
              title="Reiniciar Simulación"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Role Navigation Dashboard Tabs */}
      <div className="bg-slate-100 border-b border-slate-200 py-3 px-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 justify-center sm:justify-start">
          {[
            { id: 'borrower', label: 'Solicitante', icon: User, color: 'text-teal-600 border-teal-500' },
            { id: 'analyst', label: 'Analista de Riesgo', icon: Cpu, color: 'text-indigo-600 border-indigo-500' },
            { id: 'investor', label: 'Inversionista Portal', icon: Landmark, color: 'text-emerald-600 border-emerald-500' },
            { id: 'collections', label: 'Servicing & Cobros', icon: CreditCard, color: 'text-orange-600 border-orange-500' },
            { id: 'compliance', label: 'Cumplimiento / Regulador', icon: Shield, color: 'text-cyan-600 border-cyan-500' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = role === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setRole(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive 
                    ? 'bg-white shadow-sm border border-slate-200 ' + tab.color.split(' ')[0]
                    : 'text-slate-500 hover:bg-white/50 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="transition-all duration-300">
          {role === 'borrower' && (
            <BorrowerPortal onApplicationCreated={refreshDB} />
          )}

          {role === 'analyst' && (
            <AnalystConsole applications={applications} onRefresh={refreshDB} />
          )}

          {role === 'investor' && (
            <InvestorPortal metrics={computeInvestorMetrics()} onRefresh={refreshDB} />
          )}

          {role === 'collections' && (
            <CollectionsConsole applications={applications} onRefresh={refreshDB} />
          )}

          {role === 'compliance' && (
            <ComplianceConsole applications={applications} events={events} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-medium">
        © 2026 NeoLend Financial Corp. · Hackatón Final 16/06/2026 · local-first
      </footer>
    </div>
  );
}
