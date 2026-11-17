import React from 'react';
import { X, Hexagon, ExternalLink, Shield, Clock, CheckCircle2, FileText } from 'lucide-react';
import { PaymentRecord } from '../types/payment';
import { getIpfsGatewayUrl } from '../services/ipfsService';

interface NFTBadgeModalProps {
  payment: PaymentRecord | null;
  contractAddress: string;
  onClose: () => void;
}

export const NFTBadgeModal: React.FC<NFTBadgeModalProps> = ({
  payment,
  contractAddress,
  onClose,
}) => {
  if (!payment) return null;

  const activeCid = payment.deliverableCID || payment.agreementCID;
  const dueDateStr = new Date(payment.dueTime * 1000).toLocaleString('es-ES');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Cabecera visual del Token ERC721 */}
        <div className="relative bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-400">
              <Hexagon className="h-6 w-6" />
            </div>
            <div>
              <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-emerald-300">
                ERC-721 DelayedPayments (DPA)
              </span>
              <h3 className="mt-1 font-mono text-lg font-bold text-white">
                Token {payment.shortId}
              </h3>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border border-slate-800/90 bg-slate-950/60 p-3">
            <div>
              <div className="text-[11px] text-slate-400">Valor Asegurado</div>
              <div className="font-mono text-base font-bold text-emerald-400">
                {payment.amountEth} ETH
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Estado On-Chain</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                {payment.claimed ? (
                  <span className="text-slate-400">Quemado / Liquidado</span>
                ) : payment.approved ? (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprobado
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="h-3.5 w-3.5" /> En Escrow
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Metadatos del Token y resolución IPFS */}
        <div className="space-y-3 p-6 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400">Contrato ERC-721:</span>
            <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-mono text-slate-300">
              {contractAddress}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <div className="text-[10px] uppercase text-slate-400">Deudor (Owner)</div>
              <div className="mt-1 truncate font-mono text-slate-200" title={payment.debtor}>
                {payment.debtor}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5">
              <div className="text-[10px] uppercase text-slate-400">Beneficiario</div>
              <div className="mt-1 truncate font-mono text-slate-200" title={payment.beneficiary}>
                {payment.beneficiary}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <span className="flex items-center gap-1 text-slate-400">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>tokenURI(uint256) basado en IPFS:</span>
            </span>
            <div className="break-all rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-[11px] text-emerald-300">
              {payment.tokenURI}
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Acuerdo Inicial (agreementCID):</span>
              <a
                href={getIpfsGatewayUrl(payment.agreementCID)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:underline"
              >
                <span>{payment.agreementCID.slice(0, 10)}…</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Entregable (deliverableCID):</span>
              {payment.deliverableCID ? (
                <a
                  href={getIpfsGatewayUrl(payment.deliverableCID)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-sky-400 hover:underline"
                >
                  <span>{payment.deliverableCID.slice(0, 10)}…</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-mono text-slate-500">Pendiente de entrega</span>
              )}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-slate-400">Vencimiento (_dueTime):</span>
              <span className="font-mono text-slate-300">{dueDateStr}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            {activeCid && (
              <a
                href={getIpfsGatewayUrl(activeCid)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Abrir URI en Gateway Local</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
