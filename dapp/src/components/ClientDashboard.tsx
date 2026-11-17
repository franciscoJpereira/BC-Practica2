import React, { useState } from 'react';
import {
  PlusCircle,
  ExternalLink,
  Scissors,
  CheckCircle2,
  Clock,
  Hexagon,
  FileCheck,
  Filter,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { ethers } from 'ethers';
import { PaymentRecord } from '../types/payment';
import { IPFSManager } from './IPFSManager';
import { getIpfsGatewayUrl } from '../services/ipfsService';

interface ClientDashboardProps {
  account: string;
  payments: PaymentRecord[];
  onCreatePayment: (params: {
    dueTime: number;
    amountEth: string;
    beneficiary: string;
    agreementCID: string;
    fundImmediately?: boolean;
  }) => Promise<void>;
  onOpenFundModal: (payment: PaymentRecord) => void;
  onOpenSplitModal: (payment: PaymentRecord) => void;
  onOpenNftModal: (payment: PaymentRecord) => void;
  onSelectPaymentForOrbit: (paymentId: string) => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({
  account,
  payments,
  onCreatePayment,
  onOpenFundModal,
  onOpenSplitModal,
  onOpenNftModal,
  onSelectPaymentForOrbit,
}) => {
  const [beneficiary, setBeneficiary] = useState<string>(
    '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
  );
  const [amountEth, setAmountEth] = useState<string>('1.25');
  const [dueDays, setDueDays] = useState<string>('7');
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [agreementCID, setAgreementCID] = useState<string>('');
  const [fundImmediately, setFundImmediately] = useState<boolean>(true);
  const [onlyMyDebts, setOnlyMyDebts] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);

  const visiblePayments = payments.filter((p) => {
    if (!onlyMyDebts || !account) return true;
    return p.debtor.toLowerCase() === account.toLowerCase();
  });

  const activeEscrowTotal = visiblePayments
    .filter((p) => !p.claimed)
    .reduce((acc, item) => acc + (parseFloat(item.payedEth) || 0), 0);

  const pendingDeliverableReviews = visiblePayments.filter(
    (p) => !p.claimed && !p.approved && Boolean(p.deliverableCID)
  ).length;

  const approvedCount = visiblePayments.filter((p) => p.approved && !p.claimed).length;

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiary.trim() || !amountEth || !agreementCID.trim()) return;

    let dueTimestamp: number;
    if (customDateTime) {
      dueTimestamp = Math.floor(new Date(customDateTime).getTime() / 1000);
    } else {
      const days = Math.max(1, parseInt(dueDays, 10) || 7);
      dueTimestamp = Math.floor(Date.now() / 1000) + days * 86400;
    }

    setCreating(true);
    try {
      await onCreatePayment({
        dueTime: dueTimestamp,
        amountEth,
        beneficiary: beneficiary.trim(),
        agreementCID: agreementCID.trim(),
        fundImmediately,
      });
      setAgreementCID('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs Financieros del Cliente (Debtor) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
          <span className="text-xs font-medium text-slate-400">
            Total Fondeado en Escrow
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-white">
              {activeEscrowTotal.toFixed(2)} ETH
            </span>
            <span className="text-xs text-emerald-400">Depositado vía pay()</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
          <span className="text-xs font-medium text-slate-400">
            Entregables Listos para Revisión
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-amber-400">
              {pendingDeliverableReviews}
            </span>
            <span className="text-xs text-slate-400">Con deliverableCID en IPFS</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
          <span className="text-xs font-medium text-slate-400">
            Hitos Aprobados / Divididos
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {approvedCount}
            </span>
            <span className="text-xs text-slate-400">Listos para Claim</span>
          </div>
        </div>
      </div>

      {/* Formulario de Creación de Pago en Escrow (createPayment + pay) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              <span>Crear Pago Asegurado en Escrow (createPayment)</span>
            </h2>
            <p className="text-xs text-slate-400">
              Acuña un token ERC-721 vinculando el acuerdo de servicio en IPFS Kubo (`agreementCID`).
            </p>
          </div>
          <span className="hidden rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-[11px] text-emerald-300 sm:inline-block">
            Rol: Debtor (Cliente)
          </span>
        </div>

        <form onSubmit={handleSubmitCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Dirección Proveedor (_beneficiary)
              </label>
              <input
                type="text"
                required
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="0x..."
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Importe Comprometido (_amount ETH)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                required
                value={amountEth}
                onChange={(e) => setAmountEth(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Vencimiento (_dueTime)
              </label>
              <div className="mt-1.5 flex gap-2">
                <select
                  value={dueDays}
                  onChange={(e) => {
                    setDueDays(e.target.value);
                    setCustomDateTime('');
                  }}
                  className="w-28 rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="1">+24 Horas</option>
                  <option value="3">+3 Días</option>
                  <option value="7">+7 Días</option>
                  <option value="14">+14 Días</option>
                  <option value="30">+30 Días</option>
                </select>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2.5 py-1.5 font-mono text-[11px] text-slate-300 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <IPFSManager
            label="Términos del Servicio / Acuerdo en IPFS (_agreementCID)"
            helperText="Sube el contrato PDF/Markdown a Kubo (127.0.0.1:5001) para obtener el agreementCID."
            currentCid={agreementCID}
            onCidGenerated={(cid) => setAgreementCID(cid)}
            accentColor="emerald"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={fundImmediately}
                onChange={(e) => setFundImmediately(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span>
                Fondear inmediatamente al crear ejecutando{' '}
                <code className="font-mono text-emerald-400">pay(paymentId)</code>
              </span>
            </label>

            <button
              type="submit"
              disabled={creating || !agreementCID.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-emerald-400 disabled:opacity-50"
            >
              <PlusCircle className="h-4 w-4" />
              <span>
                {creating
                  ? 'Procesando en Blockchain...'
                  : fundImmediately
                  ? `Crear y Fondear Escrow (${amountEth || '0'} ETH)`
                  : `Crear Compromiso Diferido (${amountEth || '0'} ETH)`}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Panel de Control de Pagos Creados y Revisión de Entregables */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Panel de Control de Pagos y Auditoría de Entregables
            </h3>
            <p className="text-xs text-slate-400">
              Fondea pagos diferidos con <code className="font-mono text-emerald-400">pay()</code>, revisa el{' '}
              <code className="font-mono text-sky-400">deliverableCID</code> en el Gateway local y ejecuta{' '}
              <code className="font-mono text-emerald-400">splitAndApproveMilestone</code>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOnlyMyDebts(!onlyMyDebts)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              onlyMyDebts
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>{onlyMyDebts ? 'Mostrando solo mis pagos' : 'Mostrando todos los pagos'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {visiblePayments.map((payment) => {
            const isMatured = payment.dueTime * 1000 <= Date.now();
            const isFullyFunded = ethers.BigNumber.from(payment.payedWei).gte(
              ethers.BigNumber.from(payment.amountWei)
            );

            return (
              <div
                key={payment.id}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/75 p-5 transition hover:border-slate-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800/80 pb-3.5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenNftModal(payment)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      title="Inspeccionar Token ERC-721 y tokenURI"
                    >
                      <Hexagon className="h-5 w-5" />
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-bold text-white">
                          Pago {payment.shortId}
                        </span>
                        {payment.parentPaymentId && (
                          <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                            Sub-pago de #{payment.parentPaymentId}
                          </span>
                        )}
                        {payment.claimed ? (
                          <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                            Reclamado (Claimed)
                          </span>
                        ) : payment.approved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Hito Aprobado
                          </span>
                        ) : payment.deliverableCID ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                            <FileCheck className="h-3 w-3" /> Entregable Recibido (En Revisión)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-medium text-slate-300">
                            <Clock className="h-3 w-3" /> Esperando Entregable
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        Beneficiario: <span className="text-slate-200">{payment.beneficiary}</span>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-emerald-400">
                      {payment.payedEth} / {payment.amountEth} ETH
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Vence: {new Date(payment.dueTime * 1000).toLocaleDateString('es-ES')}{' '}
                      {isMatured && <span className="text-amber-400">(Plazo cumplido)</span>}
                    </div>
                  </div>
                </div>

                {/* Tarjeta de Revisión de Acuerdos y Entregables en IPFS */}
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-400">
                        Acuerdo Inicial (agreementCID):
                      </span>
                      <a
                        href={getIpfsGatewayUrl(payment.agreementCID)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-emerald-400 hover:underline"
                      >
                        <span>Ver en Gateway :8080</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-slate-200">
                      {payment.agreementCID}
                    </p>
                  </div>

                  <div
                    className={`rounded-xl border p-3 ${
                      payment.deliverableCID
                        ? 'border-sky-500/30 bg-sky-500/5'
                        : 'border-slate-800/80 bg-slate-950/60'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">
                        Entregable del Proveedor (deliverableCID):
                      </span>
                      {payment.deliverableCID ? (
                        <a
                          href={getIpfsGatewayUrl(payment.deliverableCID)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:underline"
                        >
                          <span>Auditar en Gateway :8080</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500">Sin envío aún</span>
                      )}
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-slate-200">
                      {payment.deliverableCID || 'El proveedor aún no ha ejecutado submitDeliverable'}
                    </p>
                  </div>
                </div>

                {/* Acciones del Cliente: Fondear (pay) + Aprobar Hito y Dividir + Ver Token ERC721 */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenNftModal(payment)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                    >
                      <Hexagon className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Ver Token ERC-721 &amp; URI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectPaymentForOrbit(payment.id)}
                      className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700"
                    >
                      Filtrar en OrbitDB Log
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!payment.claimed && !isFullyFunded && (
                      <button
                        type="button"
                        onClick={() => onOpenFundModal(payment)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        <span>Fondear Pago (pay)</span>
                      </button>
                    )}

                    {!payment.claimed && !payment.approved && (
                      <button
                        type="button"
                        onClick={() => onOpenSplitModal(payment)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-emerald-400"
                      >
                        <Scissors className="h-3.5 w-3.5" />
                        <span>Aprobar Hito y Dividir (splitAndApproveMilestone)</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {visiblePayments.length === 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-2 text-sm font-medium text-slate-300">
                No se encontraron pagos registrados para este filtro.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
