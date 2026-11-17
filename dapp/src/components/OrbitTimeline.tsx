import React, { useEffect, useState } from 'react';
import {
  Radio,
  MessageSquarePlus,
  ExternalLink,
  Flag,
  Activity,
  AlertTriangle,
  Database,
  FileCheck2,
} from 'lucide-react';
import { OrbitEventType, OrbitLogEntry, PaymentRecord, UserRole } from '../types/payment';
import { orbitService } from '../services/orbitService';
import { getIpfsGatewayUrl } from '../services/ipfsService';

interface OrbitTimelineProps {
  account: string;
  role: UserRole;
  payments: PaymentRecord[];
  selectedPaymentId: string;
  onSelectPaymentId: (id: string) => void;
}

export const OrbitTimeline: React.FC<OrbitTimelineProps> = ({
  account,
  role,
  payments,
  selectedPaymentId,
  onSelectPaymentId,
}) => {
  const [entries, setEntries] = useState<OrbitLogEntry[]>([]);
  const [dbAddress, setDbAddress] = useState<string>(orbitService.getDatabaseAddress());
  const [eventType, setEventType] = useState<OrbitEventType>('PROGRESS_UPDATE');
  const [paymentIdInput, setPaymentIdInput] = useState<string>(
    selectedPaymentId !== 'ALL' ? selectedPaymentId : payments[0]?.id || '1001'
  );
  const [message, setMessage] = useState<string>('');
  const [cidAttachment, setCidAttachment] = useState<string>('');
  const [publishing, setPublishing] = useState<boolean>(false);

  useEffect(() => {
    orbitService.init().then((addr) => setDbAddress(addr));
    const unsubscribe = orbitService.subscribe((allEntries) => {
      setEntries(allEntries);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedPaymentId !== 'ALL') {
      setPaymentIdInput(selectedPaymentId);
    }
  }, [selectedPaymentId]);

  const filteredEntries =
    selectedPaymentId === 'ALL'
      ? entries
      : entries.filter((e) => e.paymentId === selectedPaymentId);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setPublishing(true);
    try {
      await orbitService.addEvent({
        paymentId: paymentIdInput || '1001',
        type: eventType,
        author: account || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        role,
        message: message.trim(),
        cidAttachment: cidAttachment.trim() || undefined,
      });
      setMessage('');
      setCidAttachment('');
    } finally {
      setPublishing(false);
    }
  };

  const getBadgeConfig = (type: OrbitEventType) => {
    switch (type) {
      case 'MILESTONE_STARTED':
        return {
          label: 'MILESTONE_STARTED',
          classes: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
          icon: <Flag className="h-3 w-3" />,
        };
      case 'PROGRESS_UPDATE':
        return {
          label: 'PROGRESS_UPDATE',
          classes: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
          icon: <Activity className="h-3 w-3" />,
        };
      case 'DELIVERABLE_SUBMITTED':
        return {
          label: 'DELIVERABLE_SUBMITTED',
          classes: 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300',
          icon: <FileCheck2 className="h-3 w-3" />,
        };
      case 'DISPUTE_NOTE':
        return {
          label: 'DISPUTE_NOTE',
          classes: 'border-rose-500/30 bg-rose-500/15 text-rose-300',
          icon: <AlertTriangle className="h-3 w-3" />,
        };
    }
  };

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/85 shadow-xl">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h3 className="text-sm font-bold text-white">OrbitDB EventLog (P2P Feed)</h3>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
            <Radio className="h-3 w-3 text-emerald-400" /> CRDT Sync
          </span>
        </div>

        <div
          className="mt-2 flex items-center gap-1.5 truncate rounded-lg border border-slate-800/90 bg-slate-950 px-2.5 py-1 font-mono text-[10px] text-slate-400"
          title={dbAddress}
        >
          <Database className="h-3 w-3 shrink-0 text-emerald-400" />
          <span className="truncate">{dbAddress}</span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-400">Filtrar por Token ID:</span>
          <select
            value={selectedPaymentId}
            onChange={(e) => onSelectPaymentId(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">Todos los Pagos ({entries.length})</option>
            {payments.map((p) => (
              <option key={p.id} value={p.id}>
                Pago {p.shortId} ({p.amountEth} ETH)
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handlePublish} className="border-b border-slate-800 bg-slate-950/40 p-4 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400">
              Tipo de Evento
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as OrbitEventType)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="MILESTONE_STARTED">MILESTONE_STARTED</option>
              <option value="PROGRESS_UPDATE">PROGRESS_UPDATE</option>
              <option value="DELIVERABLE_SUBMITTED">DELIVERABLE_SUBMITTED</option>
              <option value="DISPUTE_NOTE">DISPUTE_NOTE</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold uppercase text-slate-400">
              Pago Asociado
            </label>
            <select
              value={paymentIdInput}
              onChange={(e) => setPaymentIdInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 font-mono text-[11px] text-white focus:border-emerald-500 focus:outline-none"
            >
              {payments.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortId} ({p.amountEth} ETH)
                </option>
              ))}
            </select>
          </div>
        </div>

        <textarea
          rows={2}
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Añadir nota de progreso, entregable o disputa al EventLog P2P..."
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={cidAttachment}
            onChange={(e) => setCidAttachment(e.target.value)}
            placeholder="CID de evidencia opcional (Qm...)"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={publishing || !message.trim()}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            <span>Publicar</span>
          </button>
        </div>
      </form>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[540px]">
        {filteredEntries.map((entry) => {
          const badge = getBadgeConfig(entry.type);
          return (
            <div
              key={entry.hash}
              className="rounded-xl border border-slate-800/90 bg-slate-950/75 p-3 text-xs transition hover:border-slate-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${badge.classes}`}
                >
                  {badge.icon}
                  {badge.label}
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Pago #{entry.paymentId}
                </span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-200">{entry.message}</p>

              {entry.cidAttachment && (
                <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1">
                  <span className="truncate font-mono text-[10px] text-emerald-400">
                    ipfs://{entry.cidAttachment}
                  </span>
                  <a
                    href={getIpfsGatewayUrl(entry.cidAttachment)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-slate-300 hover:text-white"
                  >
                    <span>Gateway</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-between border-t border-slate-800/70 pt-2 text-[10px] text-slate-400">
                <span className="font-mono">
                  {entry.role === 'client' ? 'Debtor' : 'Beneficiary'}:{' '}
                  {entry.author.slice(0, 6)}…{entry.author.slice(-4)}
                </span>
                <span>{new Date(entry.timestamp).toLocaleTimeString('es-ES')}</span>
              </div>
              <div className="mt-0.5 truncate font-mono text-[9px] text-slate-500" title={entry.hash}>
                Entry Hash: {entry.hash}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
