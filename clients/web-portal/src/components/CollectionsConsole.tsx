import React, { useState } from 'react';
import { LoanApplication } from '../types';
import { NeoLendDatabase } from '../mockData';
import { CreditCard, Bell, Handshake, ShieldAlert, Award, FileText, CheckCircle } from 'lucide-react';

interface CollectionsConsoleProps {
  applications: LoanApplication[];
  onRefresh: () => void;
}

export default function CollectionsConsole({ applications, onRefresh }: CollectionsConsoleProps) {
  const activeLoans = applications.filter(app => app.status === 'approved_auto');
  const [selectedAppId, setSelectedAppId] = useState<string>(activeLoans[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState<number>(100);
  const [reminderChannel, setReminderChannel] = useState<'WHATSAPP' | 'SMS' | 'EMAIL'>('WHATSAPP');
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);

  const selectedApp = activeLoans.find(app => app.id === selectedAppId) || activeLoans[0];

  const handleRegisterPayment = () => {
    if (!selectedApp) return;

    // Trigger payment registration
    NeoLendDatabase.pushEvent('collections.payment.registered', selectedApp.correlationId, {
      creditId: 'cred-' + selectedApp.id.substring(4),
      amount: paymentAmount,
      paidAt: new Date().toISOString()
    });

    // Reduce outstanding principal in mock app
    const apps = NeoLendDatabase.getApplications();
    const updatedApps = apps.map(app => {
      if (app.id === selectedApp.id) {
        return {
          ...app,
          requestAmount: Math.max(0, app.requestAmount - paymentAmount)
        };
      }
      return app;
    });
    NeoLendDatabase.saveApplications(updatedApps);

    setNotificationStatus(`Pago de USD ${paymentAmount} registrado con éxito en el Ledger.`);
    setTimeout(() => setNotificationStatus(null), 3000);
    onRefresh();
  };

  const handleSendReminder = () => {
    if (!selectedApp) return;

    // Push servicing event
    NeoLendDatabase.pushEvent('collections.reminder.sent', selectedApp.correlationId, {
      channel: reminderChannel,
      applicantName: selectedApp.applicantName,
      amountVencido: Math.round(selectedApp.requestAmount * 0.15),
      tel: selectedApp.alternativeData.mobileTopupsCount > 0 ? '+51 987654321' : null
    });

    setNotificationStatus(`Recordatorio enviado vía ${reminderChannel} a ${selectedApp.applicantName}.`);
    setTimeout(() => setNotificationStatus(null), 3000);
  };

  const handleRestructure = () => {
    if (!selectedApp) return;

    // Restructure terms (extend duration, lower rate)
    const apps = NeoLendDatabase.getApplications();
    const updatedApps = apps.map(app => {
      if (app.id === selectedApp.id) {
        return {
          ...app,
          durationMonths: app.durationMonths + 6,
          manualReviewReason: `Reestructurado: Plazo extendido +6 meses.`
        };
      }
      return app;
    });
    NeoLendDatabase.saveApplications(updatedApps);

    NeoLendDatabase.pushEvent('credit.restructured', selectedApp.correlationId, {
      creditId: 'cred-' + selectedApp.id.substring(4),
      newTermMonths: selectedApp.durationMonths + 6,
      reason: 'Acuerdo de pago / Reestructuración de cartera en mora'
    });

    setNotificationStatus(`Acuerdo de pago establecido: Plazo extendido.`);
    setTimeout(() => setNotificationStatus(null), 3000);
    onRefresh();
  };

  return (
    <div id="collections-console" className="space-y-6">
      {/* Title */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-center gap-3">
        <CreditCard className="w-8 h-8 text-teal-600 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-800">Servicing, Cobranzas y Educación Financiera</h2>
          <p className="text-xs text-slate-600">Ciclo de vida post-desembolso: notificaciones de pago, reestructuraciones y cobros</p>
        </div>
      </div>

      {notificationStatus && (
        <div className="bg-teal-50 border border-teal-200 text-teal-900 p-3 rounded-lg text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle className="w-4 h-4 text-teal-600" />
          {notificationStatus}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active credit cards list */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex justify-between items-center">
            <span>Créditos Activos</span>
            <span className="bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 rounded-full font-bold">{activeLoans.length} colocados</span>
          </h3>

          {activeLoans.length > 0 ? (
            <div className="space-y-2 overflow-y-auto max-h-[350px] pr-1">
              {activeLoans.map(app => (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                    selectedApp?.id === app.id
                      ? 'border-teal-500 bg-teal-50/50'
                      : 'border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-800">{app.applicantName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">Deuda Restante: USD {app.requestAmount}</div>
                  </div>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">{app.durationMonths} meses</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-12">No hay créditos activos colocados.</p>
          )}
        </div>

        {/* Collections detailed management */}
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm lg:col-span-2 space-y-5">
          {selectedApp ? (
            <div className="space-y-5 text-xs text-slate-700">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Cliente: {selectedApp.applicantName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">Correlation ID: {selectedApp.correlationId}</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    Estado: Vigente
                  </span>
                </div>
              </div>

              {/* Outstanding balance info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-semibold">Deuda Principal</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">USD {selectedApp.requestAmount}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-semibold">Tasa de Interés</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">14.5% anual</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block font-semibold">Cuotas Totales</span>
                  <span className="text-sm font-extrabold text-slate-800 mt-0.5 block">{selectedApp.durationMonths} meses</span>
                </div>
              </div>

              {/* Actions Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
                {/* Payment register */}
                <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-150 rounded-xl">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1">
                    <CreditCard className="w-4 h-4 text-teal-600" />
                    Registrar Pago / Abono
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-semibold mb-1">Monto a Abonar (USD)</label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                        className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    <button
                      onClick={handleRegisterPayment}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-2 px-4 rounded transition cursor-pointer"
                    >
                      Aplicar Pago
                    </button>
                  </div>
                </div>

                {/* Restructuring / Agreements */}
                <div className="space-y-3 p-4 bg-slate-50/50 border border-slate-150 rounded-xl">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1">
                    <Handshake className="w-4 h-4 text-teal-600" />
                    Acuerdos y Cobranza
                  </h4>
                  
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={reminderChannel}
                        onChange={e => setReminderChannel(e.target.value as any)}
                        className="flex-1 text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-white focus:outline-none"
                      >
                        <option value="WHATSAPP">WhatsApp</option>
                        <option value="SMS">SMS</option>
                        <option value="EMAIL">Email</option>
                      </select>
                      <button
                        onClick={handleSendReminder}
                        className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                      >
                        <Bell className="w-3.5 h-3.5" /> Enviar
                      </button>
                    </div>

                    <button
                      onClick={handleRestructure}
                      className="w-full border border-teal-500 hover:bg-teal-50/50 text-teal-600 font-extrabold py-2 px-4 rounded transition cursor-pointer"
                    >
                      Reestructurar (+6 Meses Plazo)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-20">Seleccione un crédito de la lista para gestionar su cartera.</p>
          )}
        </div>
      </div>
    </div>
  );
}
