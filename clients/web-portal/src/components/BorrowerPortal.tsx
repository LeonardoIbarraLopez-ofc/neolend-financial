import React, { useState } from 'react';
import { generateUUID, calculateHash, signPayload, calculateNeoLendScore, generateSHAPValues, NeoLendDatabase } from '../mockData';
import { LoanApplication } from '../types';
import { FileText, Sliders, CheckCircle, ArrowRight, ShieldCheck, AlertTriangle, Cpu, Loader2, Sparkles, Database } from 'lucide-react';
import { motion } from 'framer-motion';

interface BorrowerPortalProps {
  onApplicationCreated: () => void;
  networkSettings?: any;
}

export default function BorrowerPortal({ onApplicationCreated, networkSettings }: BorrowerPortalProps) {
  const [step, setStep] = useState(1);
  const [applicantName, setApplicantName] = useState('Mariana Lizet Ortiz');
  const [applicantEmail, setApplicantEmail] = useState('mariana.ortiz@email.com');
  const [applicantIdCard, setApplicantIdCard] = useState('PE-72819304');
  const [requestAmount, setRequestAmount] = useState(450);
  const [durationMonths, setDurationMonths] = useState(6);
  
  // Alternative Data Sliders
  const [bureauScore, setBureauScore] = useState(620);
  const [utilityPayments, setUtilityPayments] = useState(90);
  const [walletBalance, setWalletBalance] = useState(550);
  const [ecommerceVolume, setEcommerceVolume] = useState(850);
  const [mobileTopupsCount, setMobileTopupsCount] = useState(15);

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false);
  const [sagaLogs, setSagaLogs] = useState<string[]>([]);
  const [currentSagaStep, setCurrentSagaStep] = useState(0);
  const [calculatedResult, setCalculatedResult] = useState<LoanApplication | null>(null);

  // Pre-fill helper
  const loadPreset = (type: 'ideal' | 'no-bureau' | 'high-risk') => {
    if (type === 'ideal') {
      setApplicantName('Carlos Eduardo Torres');
      setApplicantEmail('carlos.torres@email.com');
      setApplicantIdCard('MX-88273940');
      setRequestAmount(400);
      setDurationMonths(6);
      setBureauScore(740);
      setUtilityPayments(98);
      setWalletBalance(1200);
      setEcommerceVolume(2400);
      setMobileTopupsCount(28);
    } else if (type === 'no-bureau') {
      setApplicantName('Diana Maria Beltran');
      setApplicantEmail('diana.beltran@email.com');
      setApplicantIdCard('CO-10029384');
      setRequestAmount(350);
      setDurationMonths(4);
      setBureauScore(300); // Mocks NO credit history / low score
      setUtilityPayments(95);
      setWalletBalance(800);
      setEcommerceVolume(1500);
      setMobileTopupsCount(35);
    } else {
      setApplicantName('Jose Roberto Silva');
      setApplicantEmail('jose.silva@email.com');
      setApplicantIdCard('AR-49203921');
      setRequestAmount(1200); // High amount triggers manual
      setDurationMonths(12);
      setBureauScore(450);
      setUtilityPayments(50);
      setWalletBalance(50);
      setEcommerceVolume(100);
      setMobileTopupsCount(2);
    }
  };

  const handleStartSimulation = async () => {
    setIsSimulating(true);
    setSagaLogs([]);
    setCurrentSagaStep(1);
    
    const correlationId = 'corr-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Live API integration attempt
    let liveResponseOk = false;
    if (networkSettings && networkSettings.isRealNetwork) {
      setSagaLogs(prev => [...prev, `[network-client] 🚀 [HTTP POST] Intentando conectar con Microservicio de Originación real en: ${networkSettings.originationUrl || networkSettings.gatewayUrl}...`]);
      try {
        const payload = {
          applicantName,
          applicantEmail,
          applicantIdCard,
          requestAmount,
          durationMonths,
          alternativeData: {
            utilityPayments,
            ecommerceVolume,
            walletBalance,
            mobileTopupsCount,
            bureauScore
          }
        };
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

        const response = await fetch(`${networkSettings.originationUrl || networkSettings.gatewayUrl}/applications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          liveResponseOk = true;
          setSagaLogs(prev => [...prev, `[network-client] ✅ Conexión con Microservicio de Originación establecida. Código HTTP ${response.status}.`]);
          setSagaLogs(prev => [...prev, `[network-client] 📦 Payload JSON enviado con éxito. Sincronización inyectada.`]);
        } else {
          throw new Error(`El endpoint real devolvió un código HTTP de error: ${response.status}`);
        }
      } catch (err: any) {
        setSagaLogs(prev => [...prev, `[network-client] ⚠️ Error de conexión: ${err.message || 'Servicio fuera de línea (Offline)'}.`]);
        setSagaLogs(prev => [...prev, `[network-client] 🔄 Activando desvío inteligente (Graceful Fallback) al Motor de Simulación Local...`]);
      }
      await delay(1000);
    }

    // Phase 1: Origination Application Submitted
    setSagaLogs(prev => [...prev, `[gateway-origination-svc] 📥 Recibida solicitud para ${applicantName} por USD ${requestAmount}.`]);
    setSagaLogs(prev => [...prev, `[gateway-origination-svc] 🔑 Generado X-Correlation-ID: ${correlationId}`]);
    NeoLendDatabase.pushEvent('origination.application.submitted', correlationId, {
      applicantName,
      applicantEmail,
      applicantIdCard,
      requestAmount,
      durationMonths
    });
    await delay(1200);

    // Phase 2: Identity & OCR validation
    setCurrentSagaStep(2);
    setSagaLogs(prev => [...prev, `[identity-svc] 🔍 Iniciando OCR sobre ID: ${applicantIdCard}...`]);
    setSagaLogs(prev => [...prev, `[identity-svc] 👥 Ejecutando validación de fraude biométrico (residencia local de datos)...`]);
    setSagaLogs(prev => [...prev, `[identity-svc] ✅ Verificación de rostro coincide 98.4% con el registro civil.`]);
    
    // Check if high-risk mock
    const isFraudulent = applicantName.toLowerCase().includes('fraude') || (bureauScore < 350 && requestAmount > 1000);
    const fraudScore = isFraudulent ? 85 : Math.floor(Math.random() * 10) + 1;
    const fraudDetails = isFraudulent 
      ? ['Alerta: El ID Card tiene reporte de robo', 'Firma biométrica no coincide con base de datos nacional']
      : ['Validación biométrica exitosa', 'Verificación IP nacional limpia'];
    
    await delay(1200);

    // Phase 3: Alternative Scoring
    setCurrentSagaStep(3);
    setSagaLogs(prev => [...prev, `[scoring-svc] 📊 Conectando a Buró de Crédito Tradicional (circuit breaker activo)...`]);
    setSagaLogs(prev => [...prev, `[scoring-svc] ⚡ Bureau Score consultado con éxito: ${bureauScore}`]);
    setSagaLogs(prev => [...prev, `[scoring-svc] 📲 Orquestando recopilación de datos alternativos...`]);
    setSagaLogs(prev => [...prev, `[scoring-svc]   - Servicios Públicos: ${utilityPayments}% puntualidad`]);
    setSagaLogs(prev => [...prev, `[scoring-svc]   - Billetera Digital: USD ${walletBalance} saldo promedio`]);
    setSagaLogs(prev => [...prev, `[scoring-svc]   - E-commerce: USD ${ecommerceVolume} en consumos`]);
    setSagaLogs(prev => [...prev, `[scoring-svc] 🧠 Corriendo motor de inferencia ML local...`]);

    const finalScore = calculateNeoLendScore({
      utilityPayments,
      ecommerceVolume,
      walletBalance,
      mobileTopupsCount,
      bureauScore
    });

    const shapValues = generateSHAPValues({
      utilityPayments,
      ecommerceVolume,
      walletBalance,
      mobileTopupsCount,
      bureauScore
    }, finalScore);

    setSagaLogs(prev => [...prev, `[scoring-svc] 🎯 Score NeoLend Calculado: ${finalScore}/1000.`]);
    setSagaLogs(prev => [...prev, `[scoring-svc] 🛡️ Explicabilidad SHAP calculada con éxito.`]);
    
    NeoLendDatabase.pushEvent('scoring.score.completed', correlationId, {
      score: finalScore,
      fraudScore,
      shapSummary: shapValues.map(s => `${s.feature}: ${s.value}pts`)
    });
    
    await delay(1400);

    // Phase 4: Decision & Sourcing
    setCurrentSagaStep(4);
    setSagaLogs(prev => [...prev, `[credit-svc] ⚖️ Evaluando motor de reglas de riesgo...`]);
    
    let finalStatus: 'approved_auto' | 'approved_manual' | 'rejected' = 'approved_auto';
    let reviewReason = '';

    if (fraudScore > 50) {
      finalStatus = 'rejected';
      reviewReason = 'Solicitud RECHAZADA por alto riesgo de fraude.';
    } else if (requestAmount > 500) {
      finalStatus = 'approved_manual';
      reviewReason = `Solicitud de USD ${requestAmount} excede límite automático de USD 500. Escala a mesa de analistas de riesgo.`;
    } else if (finalScore < 500) {
      finalStatus = 'rejected';
      reviewReason = `Score NeoLend (${finalScore}) por debajo del mínimo tolerable (500).`;
    } else {
      finalStatus = 'approved_auto';
      reviewReason = `Crédito de USD ${requestAmount} pre-aprobado instantáneamente en 90 segundos.`;
    }

    setSagaLogs(prev => [...prev, `[credit-svc] 🏷️ Decisión de Crédito: ${finalStatus.toUpperCase()}`]);
    if (reviewReason) {
      setSagaLogs(prev => [...prev, `[credit-svc] 📝 Motivo: ${reviewReason}`]);
    }

    // Hash & Sign decision for compliance-svc (MVP 4)
    const auditData = { correlationId, applicantName, finalScore, finalStatus, timestamp: new Date().toISOString() };
    const hash = calculateHash(auditData);
    const signature = signPayload(hash);

    setSagaLogs(prev => [...prev, `[compliance-svc] 🔏 Sellando decisión criptográficamente (JWS)...`]);
    setSagaLogs(prev => [...prev, `[compliance-svc] ✅ Hash inmutable registrado: ${hash.substring(0, 16)}...`]);

    const newApp: LoanApplication = {
      id: generateUUID(),
      correlationId,
      applicantName,
      applicantEmail,
      applicantIdCard,
      idPhotoUrl: applicantName.includes('Jose') ? 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200' : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      requestAmount,
      durationMonths,
      status: finalStatus,
      createdAt: new Date().toISOString(),
      alternativeData: {
        utilityPayments,
        ecommerceVolume,
        walletBalance,
        mobileTopupsCount,
        bureauScore
      },
      score: finalScore,
      shapValues,
      fraudScore,
      fraudDetails,
      manualReviewReason: reviewReason,
      auditHash: hash,
      signature
    };

    const currentApps = NeoLendDatabase.getApplications();
    currentApps.unshift(newApp);
    NeoLendDatabase.saveApplications(currentApps);

    NeoLendDatabase.pushEvent('decision.made', correlationId, {
      decisionId: generateUUID(),
      status: finalStatus,
      amount: requestAmount,
      reviewReason,
      hash,
      signature
    });

    setCalculatedResult(newApp);
    setCurrentSagaStep(5);
    setIsSimulating(false);
    onApplicationCreated();
  };

  const resetForm = () => {
    setStep(1);
    setCalculatedResult(null);
    setSagaLogs([]);
    setCurrentSagaStep(0);
  };

  return (
    <div id="borrower-portal" className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-300" />
            Portal Auto-Servicio del Solicitante
          </h2>
          <p className="text-xs text-teal-100">
            Simulador de solicitud de crédito digital en menos de 3 minutos
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            id="preset-ideal"
            onClick={() => loadPreset('ideal')} 
            className="text-[11px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer"
          >
            Perfil Ideal
          </button>
          <button 
            id="preset-nobureau"
            onClick={() => loadPreset('no-bureau')} 
            className="text-[11px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer"
          >
            Sin Historial (L-1st)
          </button>
          <button 
            id="preset-manual"
            onClick={() => loadPreset('high-risk')} 
            className="text-[11px] bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer"
          >
            Monto Alto / Alerta
          </button>
        </div>
      </div>

      <div className="p-6">
        {step === 1 && !isSimulating && !calculatedResult && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg flex items-start gap-3 border border-slate-200">
              <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Cero Exclusión:</span> El algoritmo de NeoLend utiliza <strong>datos alternativos</strong> (servicios, billeteras y e-commerce) para evaluar el riesgo de personas sin historial crediticio formal.
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Personal Data */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-1 border-b border-slate-100">
                  <FileText className="w-4 h-4 text-slate-500" />
                  Datos Personales & KYC
                </h3>
                
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nombre Completo</label>
                  <input 
                    id="input-name"
                    type="text" 
                    value={applicantName} 
                    onChange={e => setApplicantName(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
                    <input 
                      id="input-email"
                      type="email" 
                      value={applicantEmail} 
                      onChange={e => setApplicantEmail(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nº Documento</label>
                    <input 
                      id="input-idcard"
                      type="text" 
                      value={applicantIdCard} 
                      onChange={e => setApplicantIdCard(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-sans"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 bg-teal-50/50 border border-teal-100 rounded-lg">
                  <label className="block text-xs font-medium text-teal-800 mb-2">Simulación de Foto de Documento</label>
                  <div className="border-2 border-dashed border-teal-200 rounded-lg bg-white p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-teal-50/20 transition">
                    <Database className="w-8 h-8 text-teal-500 mb-2" />
                    <span className="text-xs font-medium text-slate-700">Documento_Identidad.jpg cargado</span>
                    <span className="text-[10px] text-slate-400 mt-1">Validado con biométricos del Registro Civil Nacional</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Monto Solicitado (USD)</label>
                    <div className="flex items-center border border-slate-200 rounded px-2 py-1.5">
                      <span className="text-slate-400 text-sm font-medium mr-1">$</span>
                      <input 
                        id="input-amount"
                        type="number" 
                        value={requestAmount} 
                        onChange={e => setRequestAmount(Number(e.target.value))}
                        className="w-full text-sm text-slate-800 focus:outline-none font-medium"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Hasta USD 500 auto-aprobado</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Plazo Solicitado (Meses)</label>
                    <select 
                      id="select-duration"
                      value={durationMonths} 
                      onChange={e => setDurationMonths(Number(e.target.value))}
                      className="w-full text-sm border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
                    >
                      <option value={3}>3 meses</option>
                      <option value={6}>6 meses</option>
                      <option value={12}>12 meses</option>
                      <option value={18}>18 meses</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Right Column: Alternative Financial Sources */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 pb-1 border-b border-slate-200">
                  <Sliders className="w-4 h-4 text-teal-600" />
                  Fuentes de Datos Alternativas
                </h3>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Score Buró Tradicional</span>
                    <span className="text-teal-600 font-mono font-bold">{bureauScore} / 850</span>
                  </div>
                  <input 
                    id="slider-bureau"
                    type="range" 
                    min={300} 
                    max={850} 
                    value={bureauScore} 
                    onChange={e => setBureauScore(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <span className="text-[10px] text-slate-400 block">300 simula &quot;Sin Historial previo&quot;</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Puntualidad Luz, Agua y Telco</span>
                    <span className="text-teal-600 font-mono font-bold">{utilityPayments}% a tiempo</span>
                  </div>
                  <input 
                    id="slider-utility"
                    type="range" 
                    min={0} 
                    max={100} 
                    value={utilityPayments} 
                    onChange={e => setUtilityPayments(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <span className="text-[10px] text-slate-400 block">Comportamiento de pagos de servicios básicos</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Saldo Digital Promedio</span>
                    <span className="text-teal-600 font-mono font-bold">USD {walletBalance}</span>
                  </div>
                  <input 
                    id="slider-wallet"
                    type="range" 
                    min={0} 
                    max={3000} 
                    step={50}
                    value={walletBalance} 
                    onChange={e => setWalletBalance(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <span className="text-[10px] text-slate-400 block">Saldo en Billeteras Digitales asociadas</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Consumos E-commerce (6M)</span>
                    <span className="text-teal-600 font-mono font-bold">USD {ecommerceVolume}</span>
                  </div>
                  <input 
                    id="slider-ecommerce"
                    type="range" 
                    min={0} 
                    max={5000} 
                    step={100}
                    value={ecommerceVolume} 
                    onChange={e => setEcommerceVolume(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <span className="text-[10px] text-slate-400 block">Historial transaccional en comercio electrónico</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-1">
                    <span>Recargas Celulares (3M)</span>
                    <span className="text-teal-600 font-mono font-bold">{mobileTopupsCount} recargas</span>
                  </div>
                  <input 
                    id="slider-topups"
                    type="range" 
                    min={0} 
                    max={50} 
                    value={mobileTopupsCount} 
                    onChange={e => setMobileTopupsCount(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <span className="text-[10px] text-slate-400 block">Frecuencia de recargas como indicador alternativo de flujo</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <motion.button 
                id="btn-solicitar"
                onClick={handleStartSimulation}
                whileHover={{ scale: 1.05, y: -2, rotateX: 6, rotateY: -6, boxShadow: "0 15px 30px -10px rgba(13,148,136,0.4)" }}
                whileTap={{ scale: 0.98, y: 1, rotateX: 0, rotateY: 0 }}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-extrabold px-8 py-3.5 rounded-xl text-sm flex items-center gap-2 cursor-pointer border border-teal-700/50 shadow-md"
              >
                <span>Solicitar Crédito Instantáneo</span>
                <ArrowRight className="w-4 h-4 text-emerald-100" />
              </motion.button>
            </div>
          </div>
        )}

        {/* Real-time Saga Simulation Timeline */}
        {isSimulating && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-5 font-mono text-xs text-teal-400 shadow-inner max-h-[300px] overflow-y-auto border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-slate-400 font-semibold">Consola de Microservicios (Orquestación Saga)</span>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
              </div>
              <div className="space-y-1.5">
                {sagaLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed animate-fade-in">
                    <span className="text-teal-600">❯</span> {log}
                  </div>
                ))}
                <div className="flex items-center gap-2 text-white pt-2 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                  Procesando flujo de originación...
                </div>
              </div>
            </div>

            {/* Visual step indicators */}
            <div className="grid grid-cols-4 gap-4 text-center">
              {[
                { title: '1. Solicitud', desc: 'Envío de datos' },
                { title: '2. Identidad', desc: 'KYC & Biometría' },
                { title: '3. Scoring', desc: 'Inferencia ML' },
                { title: '4. Decisión', desc: 'Sello JWS & ES' }
              ].map((s, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-lg border transition ${
                    currentSagaStep === idx + 1 
                      ? 'bg-teal-50 border-teal-300 text-teal-800 font-semibold shadow-sm' 
                      : currentSagaStep > idx + 1 
                        ? 'bg-emerald-50/50 border-emerald-100 text-emerald-700' 
                        : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="text-xs">{s.title}</div>
                  <div className="text-[10px] mt-0.5 opacity-80">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post Simulation Result */}
        {!isSimulating && calculatedResult && (
          <div className="space-y-6 animate-fade-in">
            <div className={`p-6 rounded-xl border ${
              calculatedResult.status === 'approved_auto' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : calculatedResult.status === 'approved_manual' 
                  ? 'bg-amber-50 border-amber-200 text-amber-900' 
                  : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {calculatedResult.status === 'approved_auto' && <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />}
                  {calculatedResult.status === 'approved_manual' && <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />}
                  {calculatedResult.status === 'rejected' && <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />}
                  <div>
                    <h3 className="text-lg font-bold">
                      {calculatedResult.status === 'approved_auto' && '¡Crédito Auto-Aprobado!'}
                      {calculatedResult.status === 'approved_manual' && 'Crédito Escalado a Revisión Manual'}
                      {calculatedResult.status === 'rejected' && 'Crédito No Aprobado'}
                    </h3>
                    <p className="text-xs opacity-90 mt-1">
                      {calculatedResult.manualReviewReason}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-slate-500 uppercase">Score Evaluado</div>
                  <div className="text-2xl font-black font-mono tracking-tight">{calculatedResult.score}</div>
                </div>
              </div>

              {/* Mini Feature Breakdown */}
              <div className="mt-5 bg-white/70 backdrop-blur-sm p-4 rounded-lg border border-white/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Cpu className="w-3.5 h-3.5 text-teal-600" />
                  Métricas de Datos Alternativos Evaluadas (ML scoring-svc)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white/60 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">Puntualidad Luz/Agua</div>
                    <div className="text-xs font-bold text-slate-800">{calculatedResult.alternativeData.utilityPayments}%</div>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">Compras E-comm</div>
                    <div className="text-xs font-bold text-slate-800">USD {calculatedResult.alternativeData.ecommerceVolume}</div>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">Billetera Digital</div>
                    <div className="text-xs font-bold text-slate-800 font-mono">USD {calculatedResult.alternativeData.walletBalance}</div>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-slate-100">
                    <div className="text-[10px] text-slate-400">Alerta Fraude</div>
                    <div className="text-xs font-bold text-slate-800">{calculatedResult.fraudScore}%</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row justify-between gap-3 text-xs border-t border-slate-200/50 pt-4">
                <div>
                  <span className="font-semibold">ID de Solicitud:</span> <span className="font-mono text-[11px] bg-white/60 px-1 py-0.5 rounded">{calculatedResult.id.substring(0, 13)}...</span>
                </div>
                <div>
                  <span className="font-semibold">Correlation ID (Kafka):</span> <span className="font-mono text-[11px] bg-white/60 px-1 py-0.5 rounded text-teal-700 font-bold">{calculatedResult.correlationId}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600">
              <span>Puedes cambiar de portal para ver cómo el <strong>Analista</strong> o el módulo de <strong>Desembolso y Cobranza</strong> ven este registro en tiempo real.</span>
              <button 
                id="btn-solicitar-nueva"
                onClick={resetForm} 
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 py-2.5 rounded-xl font-bold transition duration-150 shrink-0 cursor-pointer shadow-sm animate-pulse"
              >
                Nueva Solicitud
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
