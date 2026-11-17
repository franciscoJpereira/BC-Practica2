import React, { useState } from 'react';
import { UploadCloud, FileCheck2, ExternalLink, Copy, Check, Loader2 } from 'lucide-react';
import { uploadFileToIPFS, getIpfsGatewayUrl } from '../services/ipfsService';
import { IpfsUploadResult } from '../types/payment';

interface IPFSManagerProps {
  label: string;
  helperText?: string;
  currentCid: string;
  onCidGenerated: (cid: string, result?: IpfsUploadResult) => void;
  accentColor?: 'emerald' | 'sky';
}

export const IPFSManager: React.FC<IPFSManagerProps> = ({
  label,
  helperText = 'Sube el documento al nodo Kubo local (http://127.0.0.1:5001) para anclar su CID inmutable.',
  currentCid,
  onCidGenerated,
  accentColor = 'emerald',
}) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadMeta, setUploadMeta] = useState<IpfsUploadResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorMsg(null);
    try {
      const result = await uploadFileToIPFS(file);
      setUploadMeta(result);
      onCidGenerated(result.cid, result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al subir archivo a IPFS');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyCid = () => {
    if (!currentCid) return;
    navigator.clipboard.writeText(currentCid);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const borderAccent =
    accentColor === 'emerald'
      ? 'hover:border-emerald-500/50 focus-within:border-emerald-500'
      : 'hover:border-sky-500/50 focus-within:border-sky-500';

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
        <span className="font-mono text-[11px] text-slate-400">API: 127.0.0.1:5001</span>
      </div>

      {/* Selector de archivo hacia IPFS Kubo */}
      <div
        className={`relative rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-3.5 transition ${borderAccent}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                accentColor === 'emerald'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-sky-500/10 text-sky-400'
              }`}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentCid ? (
                <FileCheck2 className="h-4 w-4" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-200">
                {uploading
                  ? 'Fragmentando y anclando bloques en IPFS Kubo...'
                  : uploadMeta
                  ? `${uploadMeta.name} (${(uploadMeta.size / 1024).toFixed(1)} KB)`
                  : 'Seleccionar archivo (PDF, JSON, ZIP, Markdown)'}
              </p>
              <p className="text-[11px] text-slate-400">{helperText}</p>
            </div>
          </div>

          <label
            className={`inline-flex cursor-pointer items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              accentColor === 'emerald'
                ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30'
                : 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border border-sky-500/30'
            }`}
          >
            <span>{uploading ? 'Subiendo...' : 'Subir a IPFS'}</span>
            <input
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Input manual o resultado automático del CID */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={currentCid}
            onChange={(e) => onCidGenerated(e.target.value)}
            placeholder="CID de IPFS (ej. QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco)"
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-slate-600 focus:outline-none"
          />
          {currentCid && (
            <>
              <button
                type="button"
                onClick={handleCopyCid}
                className="rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-slate-300 hover:bg-slate-800"
                title="Copiar CID"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <a
                href={getIpfsGatewayUrl(currentCid)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-slate-800"
                title="Abrir en Gateway Local http://127.0.0.1:8080/ipfs/"
              >
                <span>Gateway</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          )}
        </div>

        {errorMsg && <p className="mt-1.5 text-xs text-rose-400">{errorMsg}</p>}
      </div>
    </div>
  );
};
