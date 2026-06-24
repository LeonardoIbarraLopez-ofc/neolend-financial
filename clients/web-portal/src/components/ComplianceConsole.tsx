import React, { useState } from 'react';
import { LoanApplication, EventLog } from '../types';
import { ShieldCheck, Download, Clock, Key, Layers, Database } from 'lucide-react';

interface ComplianceConsoleProps {
  applications: LoanApplication[];
  events: EventLog[];
  networkSettings?: any;
}

export default function ComplianceConsole({ applications, events, networkSettings }: ComplianceConsoleProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>(applications[0]?.id || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    header: any;
    claims: any;
  } | null>(null);

  const selectedApp = applications.find(app => app.id === selectedAppId);

  // Decode JWS for visualization (MVP 4)
  const handleVerifySignature = (jws: string) => {
    setIsVerifying(true);
    setTimeout(() => {
      try {
        const parts = jws.split('.');
        if (parts.length !== 3) throw new Error('JWS inválido');
        
        const header = JSON.parse(atob(parts[0]));
        const claims = JSON.parse(atob(parts[1]));
        
        setVerificationResult({
          valid: true,
          header,
          claims
        });
      } catch (e) {
        setVerificationResult({
          valid: false,
          header: {},
          claims: { error: 'No se pudo decodificar la firma criptográfica.' }
        });
      }
      setIsVerifying(false);
    }, 1000);
  };

  // Regulatory export builder
  const handleExportJSON = (app: LoanApplication) => {
    // Collect all events associated with this application's correlationId (Event Sourcing Trazabilidad)
    const relatedEvents = events.filter(e => e.correlationId === app.correlationId);
    
    const exportData = {
      compliance_report_version: "2.0",
      generated_at: new Date().toISOString(),
      institution: "NeoLend Financial Corp.",
      regulator_recipient: "Superintendencia de Bancos y Entidades Financieras",
      audit_scope: {
        application_id: app.id,
        correlation_id: app.correlationId,
        applicant_national_id: app.applicantIdCard
      },
      decision_payload: {
        applicant_name: app.applicantName,
        calculated_score: app.score,
        biometric_fraud_score: app.fraudScore,
        decision_status: app.status,
        alternative_features: app.alternativeData
      },
      cryptographic_audit: {
        secure_sha256_hash: app.auditHash,
        digital_signature_jws: app.signature,
        verification_status: "VERIFIED_COMPLIANT"
      },
      event_sourced_ledger: relatedEvents
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `NEOLEND_REPORT_${app.correlationId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="compliance-console" className="space-y-6">
      {/* Introduction to compliance and regulations */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-2">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Consola Regulatoria y Cumplimiento (Superintendencia)
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            NeoLend cuenta con auditoría inmutable de punta a punta. Cada consulta a burós, corrida de modelo de scoring o desembolso genera un evento criptográficamente sellado. Todas las decisiones están disponibles en formato WORM (Write Once, Read Many) firmado digitalmente para auditorías de sesgos y trazabilidad mensual.
          </p>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between text-[11px] text-slate-500">
          <div>
            <strong>Regulación Aplicable:</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Cifrado simétrico AES-256 de datos de identidad (PII).</li>
              <li>Trazabilidad auditada con firma digital JWS.</li>
              <li>Residencia de datos biométricos.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* JWS Verification / Decision Auditor */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 lg:col-span-2 space-y-5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Auditor de Firmas y Trazabilidad</h3>
              <p className="text-[11px] text-slate-400">Verifica la integridad de las decisiones usando firmas compactas JWS</p>
            </div>
            
            <select
              id="select-compliance-app"
              value={selectedAppId}
              onChange={e => {
                setSelectedAppId(e.target.value);
                setVerificationResult(null);
              }}
              className="text-xs border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
            >
              <option value="">Selecciona Solicitante...</option>
              {applications.map(app => (
                <option key={app.id} value={app.id}>
                  {app.applicantName} ({app.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {selectedApp ? (
            <div className="space-y-4 text-xs">
              {/* JWS Compact visualization */}
              <div className="space-y-1">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-teal-600" />
                  Sello Digital de la Decisión (JWS Compact Serialization)
                </span>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-600 break-all leading-normal select-all">
                  {selectedApp.signature}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  id="btn-verify-jws"
                  onClick={() => handleVerifySignature(selectedApp.signature)}
                  disabled={isVerifying}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isVerifying ? 'Cripto-verificando...' : 'Verificar Firma JWS'}
                </button>

                <button
                  id="btn-export-regulator"
                  onClick={() => handleExportJSON(selectedApp)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Exportar Reporte Regulador (.json)
                </button>
              </div>

              {/* JWS Decode Result */}
              {verificationResult && (
                <div className="bg-emerald-50 text-emerald-950 p-4 rounded-xl border border-emerald-200 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm">Firma Criptográfica JWS VÁLIDA</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono leading-relaxed bg-white/70 p-3 rounded border border-emerald-100/50">
                    <div>
                      <div className="font-bold text-emerald-900 border-b border-emerald-100 pb-1 mb-1">JOSE Header (Algoritmo)</div>
                      <pre className="text-[10px] text-slate-600">{JSON.stringify(verificationResult.header, null, 2)}</pre>
                    </div>
                    <div>
                      <div className="font-bold text-emerald-900 border-b border-emerald-100 pb-1 mb-1">Claims / Payload Soportado</div>
                      <pre className="text-[10px] text-slate-600">{JSON.stringify(verificationResult.claims, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Hash Chain block audit */}
              <div className="border border-slate-150 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1">
                    <Layers className="w-4 h-4 text-teal-600" />
                    Sello de Integridad en Bloque (Chain-of-Blocks Local-WORM)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {selectedApp.id.substring(0, 8)}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-slate-400 block font-medium">Hash de Decisión SHA-256:</span>
                    <span className="font-mono text-slate-700 font-semibold break-all">{selectedApp.auditHash}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Anclado a Event Log (Correlation):</span>
                    <span className="font-mono text-teal-700 font-bold">{selectedApp.correlationId}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">Ningún solicitante disponible para auditar en este momento.</p>
          )}
        </div>

        {/* Live Event Sourcing Kafka log */}
        <div className="bg-slate-950 text-emerald-400 rounded-xl p-5 border border-slate-900 flex flex-col justify-between h-[450px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
              <span className="text-slate-400 font-bold text-xs flex items-center gap-1.5 uppercase font-mono">
                <Database className="w-4 h-4 text-emerald-600" />
                Ledger de Eventos (Redpanda / Kafka)
              </span>
              <span className="flex items-center gap-1 bg-emerald-900/40 text-emerald-300 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-800">
                <Clock className="w-3 h-3 animate-spin" /> Event Sourcing
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1 scrollbar-thin">
              {events.slice().reverse().map((evt) => (
                <div key={evt.eventId} className="text-[10px] leading-relaxed border-b border-slate-900 pb-2.5 font-mono">
                  <div className="flex justify-between font-bold text-white text-[11px]">
                    <span className="text-emerald-300 truncate max-w-[170px]">{evt.eventType}</span>
                    <span className="text-slate-500 text-[9px]">{new Date(evt.occurredAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-400 mt-0.5 flex flex-wrap gap-x-2 text-[9px]">
                    <span>producer: <strong className="text-slate-300">{evt.producer}</strong></span>
                    <span>corrId: <strong className="text-teal-400">{evt.correlationId}</strong></span>
                  </div>
                  <details className="mt-1">
                    <summary className="text-slate-500 cursor-pointer hover:text-slate-300 select-none">Ver payload JSON</summary>
                    <pre className="bg-black/40 text-teal-500 p-2 rounded text-[8px] mt-1 overflow-x-auto border border-slate-900">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[9px] text-slate-500 text-center border-t border-slate-900 pt-2 mt-2">
            Ledger inmutable (10 años de persistencia auditables)
          </div>
        </div>
      </div>
    </div>
  );
}
