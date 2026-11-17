import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useDelayedPayment } from './hooks/useDelayedPayment';
import { Navbar } from './components/Navbar';
import { ClientDashboard } from './components/ClientDashboard';
import { ProviderDashboard } from './components/ProviderDashboard';
import { OrbitTimeline } from './components/OrbitTimeline';
import { SplitApproveModal } from './components/SplitApproveModal';
import { FundPaymentModal } from './components/FundPaymentModal';
import { NFTBadgeModal } from './components/NFTBadgeModal';
import { PaymentRecord } from './types/payment';

export function App() {
  const {
    account,
    networkName,
    role,
    setRole,
    contractAddress,
    setContractAddress,
    startBlock,
    setStartBlock,
    isContractDeployed,
    payments,
    txPending,
    error,
    setError,
    lastTxHash,
    connectWallet,
    refreshPayments,
    createPayment,
    fundPayment,
    submitDeliverable,
    splitAndApproveMilestone,
    claimPayment,
    slashPayer,
  } = useDelayedPayment();

  const [fundTarget, setFundTarget] = useState<PaymentRecord | null>(null);
  const [splitTarget, setSplitTarget] = useState<PaymentRecord | null>(null);
  const [nftTarget, setNftTarget] = useState<PaymentRecord | null>(null);
  const [orbitFilterId, setOrbitFilterId] = useState<string>('ALL');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegación Superior con Rol Adaptativo */}
      <Navbar
        account={account}
        networkName={networkName}
        role={role}
        onRoleChange={setRole}
        contractAddress={contractAddress}
        onContractAddressChange={setContractAddress}
        startBlock={startBlock}
        onStartBlockChange={setStartBlock}
        isContractDeployed={isContractDeployed}
        onConnectWallet={connectWallet}
        onRefresh={refreshPayments}
      />

      {/* Banners de estado de transacción y errores */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 sm:px-6 space-y-2">
        {txPending && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-200">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
            <span>{txPending}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="rounded p-1 hover:bg-rose-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {lastTxHash && !txPending && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs text-slate-300">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>Última transacción confirmada en Blockchain:</span>
            <code className="font-mono text-emerald-400">{lastTxHash}</code>
          </div>
        )}
      </div>

      {/* Layout Principal B2B: Panel de Rol (8 cols) + Feed Colaborativo OrbitDB (4 cols) */}
      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {role === 'client' ? (
              <ClientDashboard
                account={account}
                payments={payments}
                onCreatePayment={createPayment}
                onOpenFundModal={(p) => setFundTarget(p)}
                onOpenSplitModal={(p) => setSplitTarget(p)}
                onOpenNftModal={(p) => setNftTarget(p)}
                onSelectPaymentForOrbit={(id) => setOrbitFilterId(id)}
              />
            ) : (
              <ProviderDashboard
                account={account}
                payments={payments}
                onSubmitDeliverable={submitDeliverable}
                onClaimPayment={claimPayment}
                onSlashPayer={slashPayer}
                onOpenNftModal={(p) => setNftTarget(p)}
                onSelectPaymentForOrbit={(id) => setOrbitFilterId(id)}
              />
            )}
          </div>

          {/* Columna Lateral P2P OrbitDB EventLog */}
          <div className="lg:col-span-4">
            <OrbitTimeline
              account={account}
              role={role}
              payments={payments}
              selectedPaymentId={orbitFilterId}
              onSelectPaymentId={setOrbitFilterId}
            />
          </div>
        </div>
      </main>

      {/* Modales Interactivos */}
      <FundPaymentModal
        payment={fundTarget}
        onClose={() => setFundTarget(null)}
        onConfirmFund={fundPayment}
      />

      <SplitApproveModal
        payment={splitTarget}
        onClose={() => setSplitTarget(null)}
        onConfirmSplit={splitAndApproveMilestone}
      />

      <NFTBadgeModal
        payment={nftTarget}
        contractAddress={contractAddress}
        onClose={() => setNftTarget(null)}
      />
    </div>
  );
}

export default App;
