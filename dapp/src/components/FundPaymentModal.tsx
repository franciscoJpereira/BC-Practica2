import React, { useState } from 'react';
import { X, Wallet, CheckCircle2, Coins } from 'lucide-react';
import { PaymentRecord } from '../types/payment';
import { ethers } from 'ethers';

interface FundPaymentModalProps {
  payment: PaymentRecord | null;
  onClose: () => void;
  onConfirmFund: (paymentId: string, amountEth: string) => Promise<void>;
}

export const FundPaymentModal: React.FC<FundPaymentModalProps> = ({
  payment,
  onClose,
  onConfirmFund,
}) => {
  if (!payment) return null;

  const remainingWei = ethers.BigNumber.from(payment.amountWei).sub(
    ethers.BigNumber.from(payment.payedWei)
  );
  const remainingEthStr = ethers.utils.formatEther(
    remainingWei.lt(0) ? ethers.constants.Zero : remainingWei
  );

  const [fundEth, setFundEth] = useState<string>(remainingEthStr);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundEth || parseFloat(fundEth) <= 0) return;
    setSubmitting(true);
    try {
      await onConfirmFund(payment.id, fundEth);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Fondear Pago en Escrow · pay(paymentId)
              </h3>
              <p className="font-mono text-xs text-slate-400">
                Token {payment.shortId} · Pendiente: {remainingEthStr} ETH
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
            <div>
              <span className="text-slate-400">Compromiso Total:</span>
              <div className="font-mono text-sm font-bold text-white">
                {payment.amountEth} ETH
              </div>
            </div>
            <div>
              <span className="text-slate-400">Ya Fondeado (payed):</span>
              <div className="font-mono text-sm font-bold text-emerald-400">
                {payment.payedEth} ETH
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Importe a depositar (msg.value en ETH)
              </label>
              <button
                type="button"
                onClick={() => setFundEth(remainingEthStr)}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-emerald-300 hover:border-emerald-500/50"
              >
                Máx ({remainingEthStr} ETH)
              </button>
            </div>
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              max={remainingEthStr}
              required
              value={fundEth}
              onChange={(e) => setFundEth(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 font-mono text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || parseFloat(fundEth) <= 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" />
              <span>{submitting ? 'Confirmando pay()...' : `Depositar ${fundEth} ETH`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
