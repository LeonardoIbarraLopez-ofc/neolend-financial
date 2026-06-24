import React, { useState } from 'react';
import { InvestorMetrics } from '../types';
import { TrendingUp, AlertCircle, ShieldAlert, Award, Activity, Database, Check, RefreshCw } from 'lucide-react';

interface InvestorPortalProps {
  metrics: InvestorMetrics;
  onRefresh: () => void;
  networkSettings?: any;
}

export default function InvestorPortal({ metrics, onRefresh, networkSettings }: InvestorPortalProps) {
  const [wsStatus, setWsStatus] = useState<'connected' | 'reconnecting'>('connected');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const triggerWSRefresh = () => {
    setWsStatus('reconnecting');
    setIsRefreshing(true);
    setTimeout(() => {
      setWsStatus('connected');
      setIsRefreshing(false);
      onRefresh();
    }, 1000);
  };

  // SVG Chart Dimensions
  const chartHeight = 160;
  const chartWidth = 500;
  const padding = 30;

  // Find max value in cashFlow to scale chart
  const maxVal = Math.max(
    ...metrics.flujoCajaProyectado.flatMap(d => [d.inflow, d.outflow]),
    100 // fallback
  );

  return (
    <div id="investor-portal" className="space-y-6">
      {/* Websocket & Realtime Status Alert */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative shrink-0">
            {wsStatus === 'connected' ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 animate-pulse"></span>
            )}
          </span>
          <div>
            <h3 className="text-xs font-bold text-teal-400 font-mono tracking-wider uppercase flex items-center gap-1.5">
              Portal del Inversionista (investor-svc)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {wsStatus === 'connected' 
                ? 'Sincronizado vía WebSockets en tiempo real con Kafka & Redpanda.' 
                : 'Reconectando con el broker de eventos...'}
            </p>
          </div>
        </div>

        <button 
          id="btn-ws-refresh"
          onClick={triggerWSRefresh}
          disabled={isRefreshing}
          className="bg-slate-800 hover:bg-slate-700 text-teal-300 font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Recargando...' : 'Reconectar WS'}
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">TIR de Cartera</span>
            <div className="text-xl font-black text-slate-800 font-sans mt-0.5">{metrics.irr.toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PAR 30 (Mora Corta)</span>
            <div className="text-xl font-black text-slate-800 font-sans mt-0.5">{metrics.par30.toFixed(2)}%</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-rose-50 p-3 rounded-lg text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">PAR 90 (Default)</span>
            <div className="text-xl font-black text-slate-800 font-sans mt-0.5">{metrics.par90.toFixed(2)}%</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="bg-teal-50 p-3 rounded-lg text-teal-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Principal Activo</span>
            <div className="text-xl font-black text-slate-800 font-sans mt-0.5">
              USD {metrics.outstandingPrincipal.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Projection (SVG render) */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-teal-600" />
              Proyección de Flujos de Caja (Próximos 6 Meses)
            </h3>
            <p className="text-[11px] text-slate-400">Entradas esperadas vs salidas proyectadas por cobros y desembolsos</p>
          </div>

          <div className="relative border border-slate-100 rounded-lg p-2 bg-slate-50/50 flex justify-center items-center">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#f1f5f9" strokeWidth="1" />
              <line x1={padding} y1={(chartHeight - padding) / 2} x2={chartWidth - padding} y2={(chartHeight - padding) / 2} stroke="#f1f5f9" strokeWidth="1" />
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Render Bars */}
              {metrics.flujoCajaProyectado.map((d, index) => {
                const totalItems = metrics.flujoCajaProyectado.length;
                const plotWidth = chartWidth - padding * 2;
                const barSpacing = plotWidth / totalItems;
                const xBase = padding + index * barSpacing + barSpacing / 4;
                
                const usableHeight = chartHeight - padding * 2;
                
                // Scale values
                const inflowHeight = (d.inflow / maxVal) * usableHeight;
                const outflowHeight = (d.outflow / maxVal) * usableHeight;
                
                const yInflow = chartHeight - padding - inflowHeight;
                const yOutflow = chartHeight - padding - outflowHeight;
                
                return (
                  <g key={d.month}>
                    {/* Inflow Bar (Green) */}
                    <rect
                      x={xBase}
                      y={yInflow}
                      width={barSpacing / 3}
                      height={inflowHeight}
                      fill="#10b981"
                      rx="2"
                      className="hover:opacity-85 transition-opacity"
                    />
                    
                    {/* Outflow Bar (Orange) */}
                    <rect
                      x={xBase + barSpacing / 3 + 2}
                      y={yOutflow}
                      width={barSpacing / 3}
                      height={outflowHeight}
                      fill="#f97316"
                      rx="2"
                      className="hover:opacity-85 transition-opacity"
                    />
                    
                    {/* X-Axis labels */}
                    <text
                      x={xBase + barSpacing / 3}
                      y={chartHeight - 10}
                      fontSize="9"
                      fill="#94a3b8"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {d.month}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute top-2 right-4 flex gap-4 text-[9px] font-bold">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Inflows (Cobros)
              </span>
              <span className="flex items-center gap-1.5 text-orange-600">
                <span className="w-2.5 h-2.5 bg-orange-500 rounded"></span> Outflows (Desembolsos)
              </span>
            </div>
          </div>
        </div>

        {/* Delinquency Rate by Segment */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-teal-600" />
              Morosidad por Segmento
            </h3>
            <p className="text-[11px] text-slate-400">Porcentaje de mora por banda de riesgo del motor ML</p>
          </div>

          <div className="space-y-3.5">
            {Object.entries(metrics.delinquencyBySegment).map(([segment, value]) => {
              // Color depending on risk band
              const segmentColors: Record<string, string> = {
                A: 'bg-emerald-500',
                B: 'bg-teal-500',
                C: 'bg-amber-500',
                D: 'bg-rose-500'
              };
              const labelColors: Record<string, string> = {
                A: 'text-emerald-700 bg-emerald-50 border-emerald-100',
                B: 'text-teal-700 bg-teal-50 border-teal-100',
                C: 'text-amber-700 bg-amber-50 border-amber-100',
                D: 'text-rose-700 bg-rose-50 border-rose-100'
              };

              return (
                <div key={segment} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className={`px-2 py-0.5 border rounded-md text-[10px] font-bold ${labelColors[segment] || 'text-slate-700 bg-slate-50'}`}>
                      Banda {segment}
                    </span>
                    <span className="font-mono text-slate-700 font-bold">{value.toFixed(1)}% mora</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${segmentColors[segment] || 'bg-slate-500'}`}
                      style={{ width: `${Math.min(value * 4, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Funds Details */}
      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Fondos Institucionales Asociados</h3>
          <p className="text-[11px] text-slate-400">Fondos de inversión que proveen la liquidez para los créditos aprobados</p>
        </div>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="pb-2">Fondo</th>
                <th className="pb-2">Meta TIR</th>
                <th className="pb-2">Comprometido</th>
                <th className="pb-2">Colocado</th>
                <th className="pb-2">Ratio de Uso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-medium">
              {[
                { name: 'Andes Ventures Credit Fund', target: 12.5, committed: 1000000, deployed: 480000 },
                { name: 'Sólido Liquidez Latam FI', target: 14.0, committed: 750000, deployed: 520000 },
                { name: 'NeoLend Founders Seed Fund', target: 16.5, committed: 250000, deployed: 210000 }
              ].map(fund => {
                const ratio = (fund.deployed / fund.committed) * 100;
                return (
                  <tr key={fund.name}>
                    <td className="py-3 text-slate-800 font-bold">{fund.name}</td>
                    <td className="py-3 font-mono">{fund.target.toFixed(1)}%</td>
                    <td className="py-3 font-mono">USD {fund.committed.toLocaleString()}</td>
                    <td className="py-3 font-mono text-teal-600 font-bold">USD {fund.deployed.toLocaleString()}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-teal-600 h-full" style={{ width: `${ratio}%` }} />
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 font-bold">{ratio.toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
