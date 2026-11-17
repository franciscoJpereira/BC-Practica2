import React, { useState } from 'react';
import {
  Upload,
  Coins,
  ExternalLink,
  CheckCircle2,
  Clock,
  Hexagon,
  Filter,
  Send,
  Sparkles,
  Flame,
} from 'lucide-react';
import { ethers } from 'ethers';
import { PaymentRecord } from '../types/payment';
import { IPFSManager } from './IPFSManager';
import { getIpfsGatewayUrl } from '../services/ipfsService';

interface ProviderDashboardProps {
  account: string;
  payments: PaymentRecord[];
  onSubmitDeliverable: (paymentId: string, deliverableCID: string) => Promise<void>;
  onClaimPayment: (paymentId: string) => Promise<void>;
  onSlashPayer: (paymentId: string) => Promise<void>;
  onOpenNftModal: (payment: PaymentRecord) => void;
  onSelectPaymentForOrbit: (paymentId: string) => void;
}

export const ProviderDashboard: React.FC<ProviderDashboardProps> = ({
  account,
  payments,
  onSubmitDeliverable,
  onClaimPayment,
  onSlashPayer,
  onOpenNftModal,
  onSelectPaymentForOrbit,
}) => {
  const [onlyMyBeneficiary, setOnlyMyBeneficiary] = useState<boolean>(false);
  const [draftCids, setDraftCids] = useState<Record<string, string>>({});
  const [expandedPortalId, setExpandedPortalId] = useState<string | null>(
    payments[0]?.id || null
  );

  const visiblePayments = payments.filter((p) => {
    if (!onlyMyBeneficiary || !account) return true;
    return p.beneficiary.toLowerCase() === account.toLowerCase();
  });

  const isClaimEligible = (p: PaymentRecord) => {
    if (p.claimed) return false;
    const isFullyPaid = ethers.BigNumber.from(p.payedWei).gte(
      ethers.BigNumber.from(p.amountWei)
    );
    const isMatured = p.dueTime * 1000 <= Date.now();
    // Regla del Plan (Component 1): (approved == true) OR (dueTime <= block.timestamp && bytes(deliverableCID).length > 0) cuando está fondeado
    return isFullyPaid && (p.approved || (isMatured && Boolean(p.deliverableCID)));
  };

  const claimableEth = visiblePayments
    .filter(isClaimEligible)
    .reduce((acc, item) => acc + (parseFloat(item.amountEth) || 0), 0);

  const handleDeliverableUpload = (paymentId: string, cid: string) => {
    setDraftCids((prev) => ({ ...prev, [paymentId]: cid }));
  };

  const handleSendDeliverable = async (paymentId: string) => {
    const cid = draftCids[paymentId];
    if (!cid || !cid.trim()) return;
    await onSubmitDeliverable(paymentId, cid.trim());
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Pagos Asignados al Proveedor */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
          <span className="text-xs font-medium text-slate-400">
            Pagos Asignados (Beneficiary)
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-white">
              {visiblePayments.length}
            </span>
            <span className="text-xs text-sky-400">Contratos activos</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
          <span className="text-xs font-medium text-slate-400">
            Disponible para Reclamar (Claim)
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-400">
              {claimableEth.toFixed(2)} ETH
            </span>
            <span className="text-xs text-slate-400">Aprobados o Vencidos con Entregable</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800/90 bg-slate-900/70 p-4">
          <span className="text-xs font-medium text-slate-400">
            Entregables Registrados en IPFS
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-sky-400">
              {visiblePayments.filter((p) => Boolean(p.deliverableCID)).length}
            </span>
            <span className="text-xs text-slate-400">CIDs verificables</span>
          </div>
        </div>
      </div>

      {/* Cabecera de sección */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-white">
            Portal de Entrega de Hitos y Liquidación de Fondos (Beneficiary Mode)
          </h2>
          <p className="text-xs text-slate-400">
            Sube tu comprobante a IPFS Kubo para llamar a{' '}
            <code className="font-mono text-sky-400">submitDeliverable</code> o reclama tus fondos con{' '}
            <code className="font-mono text-emerald-400">claim</code>.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOnlyMyBeneficiary(!onlyMyBeneficiary)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            onlyMyBeneficiary
              ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
          <span>
            {onlyMyBeneficiary ? 'Solo asignados a mi cuenta' : 'Todos los pagos de la red'}
          </span>
        </button>
      </div>

      {/* Tarjetas de pagos asignados al Proveedor */}
      <div className="space-y-4">
        {visiblePayments.map((payment) => {
          const isMatured = payment.dueTime * 1000 <= Date.now();
          const isFullyPaid = ethers.BigNumber.from(payment.payedWei).gte(
            ethers.BigNumber.from(payment.amountWei)
          );
          const canClaim = isClaimEligible(payment);
          const canSlash = !payment.claimed && isMatured && !isFullyPaid;
          const isPortalOpen = expandedPortalId === payment.id;
          const currentDraftCid = draftCids[payment.id] ?? payment.deliverableCID ?? '';

          return (
            <div
              key={payment.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-md transition hover:border-slate-700"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenNftModal(payment)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20"
                    title="Ver Token ERC-721"
                  >
                    <Hexagon className="h-5 w-5" />
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-white">
                        Pago {payment.shortId}
                      </span>
                      {payment.claimed ? (
                        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-400">
                          Fondos Reclamados (Claimed)
                        </span>
                      ) : canClaim ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                          <Sparkles className="h-3 w-3" /> Listo para Reclamar (
                          {payment.approved ? 'Hito Aprobado' : 'Plazo Vencido + Entregable'})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-sky-300">
                          <Clock className="h-3 w-3" /> En Ejecución
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">
                      Cliente (Debtor): <span className="text-slate-200">{payment.debtor}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-sky-400">
                    {payment.payedEth} / {payment.amountEth} ETH
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Vencimiento: {new Date(payment.dueTime * 1000).toLocaleString('es-ES')}
                  </div>
                </div>
              </div>

              {/* Estado de CIDs en IPFS */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Términos del Acuerdo (Cliente):</span>
                    <a
                      href={getIpfsGatewayUrl(payment.agreementCID)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      <span>Abrir en Gateway</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="mt-1 truncate font-mono text-slate-200">
                    {payment.agreementCID}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Entregable Registrado On-Chain:</span>
                    {payment.deliverableCID && (
                      <a
                        href={getIpfsGatewayUrl(payment.deliverableCID)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                      >
                        <span>Ver Entregable :8080</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1 truncate font-mono text-slate-200">
                    {payment.deliverableCID || 'Pendiente de envío (submitDeliverable)'}
                  </p>
                </div>
              </div>

              {/* Portal desplegable para subir entregable a IPFS y ejecutar submitDeliverable */}
              {!payment.claimed && isPortalOpen && (
                <div className="mt-4 rounded-xl border border-sky-500/30 bg-slate-950/80 p-4">
                  <IPFSManager
                    label="Portal de Entrega de Hito (_deliverableCID)"
                    helperText="Sube la evidencia o entregable del hito a tu nodo Kubo local (127.0.0.1:5001) y regístralo en el contrato."
                    currentCid={currentDraftCid}
                    onCidGenerated={(cid) => handleDeliverableUpload(payment.id, cid)}
                    accentColor="sky"
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-slate-400">
                      submitDeliverable({payment.shortId}, "{currentDraftCid.slice(0, 14)}…")
                    </span>
                    <button
                      type="button"
                      disabled={!currentDraftCid.trim()}
                      onClick={() => handleSendDeliverable(payment.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-sky-400 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Registrar Entregable en Blockchain (submitDeliverable)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Barra de acciones del Proveedor */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2">
                  {!payment.claimed && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPortalId(isPortalOpen ? null : payment.id)
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                    >
                      <Upload className="h-3.5 w-3.5 text-sky-400" />
                      <span>
                        {isPortalOpen
                          ? 'Ocultar Portal de Entrega'
                          : 'Abrir Portal de Entrega IPFS'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectPaymentForOrbit(payment.id)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-700"
                  >
                    Ver Hilo OrbitDB
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {canSlash && (
                    <button
                      type="button"
                      onClick={() => onSlashPayer(payment.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                      title="Penalizar deudor por vencimiento impago (slashPayer)"
                    >
                      <Flame className="h-3.5 w-3.5" />
                      <span>Slash Debtor</span>
                    </button>
                  )}

                  {!payment.claimed ? (
                    <button
                      type="button"
                      disabled={!canClaim}
                      onClick={() => onClaimPayment(payment.id)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold shadow-sm transition ${
                        canClaim
                          ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                          : 'cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500'
                      }`}
                      title={
                        canClaim
                          ? 'Ejecutar claim(uint256 _paymentId) y transferir ETH a tu wallet'
                          : 'Requiere fondeo 100% y (approved == true || (dueTime <= block.timestamp && deliverableCID != ""))'
                      }
                    >
                      <Coins className="h-4 w-4" />
                      <span>Reclamar Fondos (Claim {payment.amountEth} ETH)</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Liquidado en tu Wallet
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
