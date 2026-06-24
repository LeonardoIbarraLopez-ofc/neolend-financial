import React, { useState } from 'react';
import { LoanApplication } from '../types';
import { NeoLendDatabase } from '../mockData';
import { ShieldCheck, User, Sliders, BarChart2, Cpu, AlertTriangle, Eye } from 'lucide-react';

interface AnalystConsoleProps {
  applications: LoanApplication[];
  onRefresh: () => void;
}

export default function AnalystConsole({ applications, onRefresh }: AnalystConsoleProps) {
  const manualApps = applications.filter(app => app.status === 'approved_manual');
  const [selectedAppId, setSelectedAppId] = useState<string>(manualApps[0]?.id || '');
  
  const selectedApp = applications.find(app => app.id === selectedAppId) || manualApps[0];

  const handleResolve = (appId: string, status: 'approved_auto' | 'rejected', reason: string) => {
    const apps = NeoLendDatabase.getApplications();
    const updatedApps = apps.map(app => {
      if (app.id === appId) {
        return {
          ...app,
          status,
          manualReviewReason: `Resuelto por Analista: ${reason}`
        };
      }
      return app;
    });
    
    NeoLendDatabase.saveApplications(updatedApps);
    
    // Add decision event
    NeoLendDatabase.pushEvent('decision.made', selectedApp?.correlationId || '', {
      decisionId: 'dec-' + Math.random().toString(36).substring(2, 10),
      status,
      amount: selectedApp?.requestAmount,
      reviewReason: `Decisión manual por analista: ${reason}`,
      hash: selectedApp?.auditHash,
      signature: selectedApp?.signature
    });

    onRefresh();
    setSelectedAppId('');
  };

  return (
    <div id="analyst-console" className="space-y-6">
      {/* Title block */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-3">
        <Cpu className="w-8 h-8 text-teal-600 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-800">Mesa de Análisis de Riesgo & Inteligencia Explicable</h2>
          <p className="text-xs text-slate-600">Revisión de solicitudes con explicaciones SHAP en tiempo real para decisiones transparentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue of manual review items */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex justify-between items-center">
            <span>Bandeja de Casos Pendientes</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">{manualApps.length} pendientes</span>
          </h3>

          {manualApps.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1">
              {manualApps.map(app => (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedApp?.id === app.id
                      ? 'border-teal-500 bg-teal-50/50'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-bold text-slate-800">{app.applicantName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">ID: {app.applicantIdCard} · Monto: USD {app.requestAmount}</div>
                  </div>
                  <Eye className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-12">No hay créditos en cola de revisión manual.</p>
          )}
        </div>

        {/* Detailed SHAP explainer & Resolution panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2 space-y-5">
          {selectedApp ? (
            <div className="space-y-5">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-teal-600" />
                    Expediente: {selectedApp.applicantName}
                  </h3>
                  <p className="text-[10px] text-slate-400">Score NeoLend Evaluado: <strong className="text-teal-600 font-mono font-black">{selectedApp.score}/1000</strong></p>
                </div>
                <div className="text-right">
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                    Mesa de Revisión
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold">Monto Solicitado</div>
                  <div className="text-sm font-extrabold text-slate-800 mt-0.5">USD {selectedApp.requestAmount}</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold">Plazo Solicitado</div>
                  <div className="text-sm font-extrabold text-slate-800 mt-0.5">{selectedApp.durationMonths} meses</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold">Buró Tradicional</div>
                  <div className="text-sm font-extrabold text-slate-800 mt-0.5 font-mono">{selectedApp.alternativeData.bureauScore}/850</div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-400 font-semibold">Alerta de Fraude</div>
                  <div className="text-sm font-extrabold text-rose-600 mt-0.5">{selectedApp.fraudScore}%</div>
                </div>
              </div>

              {/* Alternative Data sliders visualization */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sliders className="w-3.5 h-3.5 text-teal-600" />
                  Fuentes de Datos Alternativas Consumidas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-lg border border-slate-150 text-xs">
                  <div>
                    <span className="text-slate-500 block">Puntualidad Luz/Agua/Telco:</span>
                    <span className="font-semibold text-slate-800">{selectedApp.alternativeData.utilityPayments}% a tiempo</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Transacciones E-commerce (6M):</span>
                    <span className="font-semibold text-slate-800">USD {selectedApp.alternativeData.ecommerceVolume}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Saldo Promedio Billetera:</span>
                    <span className="font-semibold text-slate-800">USD {selectedApp.alternativeData.walletBalance}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Frecuencia Recargas Celulares (3M):</span>
                    <span className="font-semibold text-slate-800">{selectedApp.alternativeData.mobileTopupsCount} recargas</span>
                  </div>
                </div>
              </div>

              {/* SHAP Chart */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <BarChart2 className="w-3.5 h-3.5 text-teal-600" />
                  Aportes a la Decisión (SHAP Values Explicables)
                </h4>
                
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {selectedApp.shapValues.map(shap => {
                    const isPositive = shap.value >= 0;
                    // Max value of shap is around 80 for scaling bar
                    const percent = Math.min(Math.abs(shap.value) * 1.25, 100);
                    
                    return (
                      <div key={shap.feature} className="grid grid-cols-1 md:grid-cols-3 items-center text-xs">
                        <span className="text-slate-600 font-medium">{shap.feature}</span>
                        <div className="md:col-span-2 flex items-center gap-2">
                          <div className="flex-1 bg-slate-200/50 h-3.5 rounded-md relative overflow-hidden">
                            <div
                              className={`h-full rounded-md transition-all duration-300 ${isPositive ? 'bg-emerald-500 float-left' : 'bg-rose-500 float-right'}`}
                              style={{
                                width: `${percent}%`,
                                marginLeft: isPositive ? '0' : 'auto',
                                marginRight: isPositive ? 'auto' : '0'
                              }}
                            />
                          </div>
                          <span className={`font-mono font-bold w-12 text-right ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {isPositive ? '+' : ''}{shap.value}pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Resolution block */}
              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Escala regulatoria: JWS de decisión inmutable será re-generado</span>
                </div>
                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleResolve(selectedApp.id, 'rejected', 'Riesgo crediticio elevado por SHAP negativo')}
                    className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition cursor-pointer"
                  >
                    Rechazar Crédito
                  </button>
                  <button
                    onClick={() => handleResolve(selectedApp.id, 'approved_auto', 'Aprobado manualmente tras verificar fuentes de ingresos alternativas')}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-lg transition cursor-pointer flex items-center gap-1"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Aprobar Crédito
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-20">Seleccione un caso pendiente a la izquierda para ver su análisis.</p>
          )}
        </div>
      </div>
    </div>
  );
}
