import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Wallet,
  Briefcase,
  UserCheck,
  Server,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { UserRole } from '../types/payment';
import { checkKuboStatus } from '../services/ipfsService';

interface NavbarProps {
  account: string;
  networkName: string;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  contractAddress: string;
  onContractAddressChange: (addr: string) => void;
  startBlock?: number;
  onStartBlockChange?: (block: number) => void;
  isContractDeployed: boolean;
  onConnectWallet: () => void;
  onRefresh: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  networkName,
  role,
  onRoleChange,
  contractAddress,
  onContractAddressChange,
  startBlock = 0,
  onStartBlockChange,
  isContractDeployed,
  onConnectWallet,
  onRefresh,
}) => {
  const [kuboOnline, setKuboOnline] = useState<boolean>(false);
  const [kuboVersion, setKuboVersion] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [tempAddress, setTempAddress] = useState<string>(contractAddress);
  const [tempStartBlock, setTempStartBlock] = useState<string>(startBlock ? String(startBlock) : '');

  useEffect(() => {
    setTempAddress(contractAddress);
  }, [contractAddress]);

  useEffect(() => {
    setTempStartBlock(startBlock ? String(startBlock) : '');
  }, [startBlock]);

  useEffect(() => {
    let mounted = true;
    const verifyKubo = async () => {
      const status = await checkKuboStatus();
      if (mounted) {
        setKuboOnline(status.online);
        setKuboVersion(status.agentVersion || '');
      }
    };
    verifyKubo();
    const timer = setInterval(verifyKubo, 12000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    onContractAddressChange(tempAddress);
    if (onStartBlockChange) {
      const parsed = parseInt(tempStartBlock, 10);
      onStartBlockChange(isNaN(parsed) || parsed < 0 ? 0 : parsed);
    }
    setShowConfig(false);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        {/* Identidad del Protocolo B2B */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-inner">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                DelayedPayment
              </span>
              <span className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
                ERC-721 Escrow
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Liquidación programable por hitos · IPFS Kubo &amp; OrbitDB P2P
            </p>
          </div>
        </div>

        {/* Conmutador de Rol Adaptativo (Cliente vs Proveedor) */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => onRoleChange('client')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              role === 'client'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Vista Cliente (Debtor)</span>
          </button>
          <button
            type="button"
            onClick={() => onRoleChange('provider')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              role === 'provider'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Vista Proveedor (Beneficiary)</span>
          </button>
        </div>

        {/* Indicadores de Infraestructura (Kubo + Smart Contract + MetaMask) */}
        <div className="flex items-center gap-2.5">
          {/* Estado de IPFS Kubo 127.0.0.1:5001 */}
          <div
            title={
              kuboOnline
                ? `Conectado a Kubo RPC (127.0.0.1:5001) ${kuboVersion}`
                : 'Kubo RPC en 127.0.0.1:5001 no detectado (Modo determinista habilitado)'
            }
            className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs md:flex"
          >
            <Server className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-400">IPFS:</span>
            <span
              className={`flex items-center gap-1 font-mono font-medium ${
                kuboOnline ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  kuboOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {kuboOnline ? 'Kubo :5001' : 'Sim/Fallback'}
            </span>
          </div>

          {/* Botón configurar dirección del contrato */}
          <button
            type="button"
            onClick={() => {
              setTempAddress(contractAddress);
              setShowConfig(!showConfig);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-800"
            title="Configurar dirección del contrato DelayedPayment"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden font-mono sm:inline">
              {contractAddress.slice(0, 6)}…{contractAddress.slice(-4)}
            </span>
            {isContractDeployed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-slate-800 bg-slate-900/70 p-2 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            title="Sincronizar estado con Blockchain"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>

          {/* Botón MetaMask */}
          {account ? (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <div className="text-left">
                <div className="font-mono text-xs font-semibold text-emerald-300">
                  {account.slice(0, 6)}…{account.slice(-4)}
                </div>
                <div className="text-[10px] leading-none text-slate-400">{networkName}</div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectWallet}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-emerald-400"
            >
              <Wallet className="h-4 w-4" />
              <span>Conectar MetaMask</span>
            </button>
          )}
        </div>
      </div>

      {/* Barra desplegable para actualizar dirección del contrato desplegado */}
      {showConfig && (
        <div className="border-t border-slate-800 bg-slate-900/95 px-4 py-3">
          <form
            onSubmit={handleSaveContract}
            className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="font-semibold text-white">Dirección DelayedPayment.sol:</span>
              <span className="text-slate-400">
                ({isContractDeployed ? 'Contrato detectado en RPC actual' : 'Modo Sandbox interactivo activo si no hay bytecode en esta red'})
              </span>
            </div>
            <div className="flex flex-1 items-center gap-2 sm:max-w-xl">
              <input
                type="text"
                value={tempAddress}
                onChange={(e) => setTempAddress(e.target.value)}
                placeholder="0x..."
                title="Dirección del contrato DelayedPayment.sol"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
              <input
                type="number"
                value={tempStartBlock}
                onChange={(e) => setTempStartBlock(e.target.value)}
                placeholder="Bloque inicio (ej: 0)"
                title="Bloque de despliegue para acotar consultas de eventos (dejar vacío o 0 para auto-detectar)"
                className="w-36 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </header>
  );
};
