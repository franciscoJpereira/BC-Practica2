import { OrbitEventType, OrbitLogEntry, UserRole } from '../types/payment';

const ORBIT_STORAGE_KEY = 'delayed_payment_orbitdb_events_v2';
const ORBIT_CHANNEL_NAME = 'orbitdb_p2p_swarm_delayed_payment';

type OrbitListener = (entries: OrbitLogEntry[]) => void;

/**
 * Servicio de gestión de OrbitDB (EventLog CRDT Append-Only)
 * Sincroniza eventos P2P entre Cliente (Debtor) y Proveedor (Beneficiary)
 * incluyendo soporte de replicación en vivo entre pestañas/pares.
 */
class OrbitDBEventLogService {
  private dbAddress = '/orbitdb/zdpuAyB2BEscrowDelayedPaymentEventLogV2/delayed-payments-events';
  private entries: OrbitLogEntry[] = [];
  private listeners: Set<OrbitListener> = new Set();
  private channel: BroadcastChannel | null = null;
  private orbitInstance: any = null;
  private isInitialized = false;

  constructor() {
    this.loadPersistedLog();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(ORBIT_CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (event.data?.type === 'REPLICATE_ENTRY') {
          this.mergeRemoteEntry(event.data.payload);
        }
      };
    }
  }

  /**
   * Inicializa la instancia de OrbitDB EventLog (con fallback resiliente en navegador)
   */
  public async init(): Promise<string> {
    if (this.isInitialized) return this.dbAddress;

    try {
      // Intento de inicialización nativa si el entorno WebRTC/Helia está disponible
      const { createHelia } = await import('helia');
      const { createOrbitDB } = await import('@orbitdb/core');
      const helia = await createHelia();
      const orbitdb = await createOrbitDB({ ipfs: helia });
      const db = await orbitdb.open('delayed-payments-events', { type: 'events' });
      this.orbitInstance = db;
      this.dbAddress = db.address.toString();

      for await (const record of db.iterator()) {
        if (record?.value) {
          this.mergeRemoteEntry(record.value as OrbitLogEntry, false);
        }
      }
    } catch {
      // En navegadores sin WebRTC relay local activo, mantenemos el EventLog CRDT sobre almacenamiento local + BroadcastChannel P2P
    }

    this.isInitialized = true;
    return this.dbAddress;
  }

  public getDatabaseAddress(): string {
    return this.dbAddress;
  }

  private loadPersistedLog(): void {
    try {
      const raw = localStorage.getItem(ORBIT_STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw);
      } else {
        this.entries = this.getSeedEntries();
        this.persist();
      }
    } catch {
      this.entries = this.getSeedEntries();
    }
  }

  private getSeedEntries(): OrbitLogEntry[] {
    const now = Date.now();
    return [
      {
        hash: 'zdpuAk9x7P2mQvR8sLwZ3cVbN6yHjK4dGfE1uIoP5tYzW2aBc',
        paymentId: '1001',
        type: 'MILESTONE_STARTED',
        author: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        role: 'provider',
        message: 'Hito #1 iniciado: Auditoría de seguridad y arquitectura del protocolo de pagos diferidos.',
        cidAttachment: 'QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco',
        timestamp: now - 3600 * 1000 * 5,
      },
      {
        hash: 'zdpuAn4mK8xLpQ2wRtY7vBnM9cXzF3sDkL6jHgF2eWqR8uIoP',
        paymentId: '1001',
        type: 'PROGRESS_UPDATE',
        author: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        role: 'provider',
        message: 'Entregable intermedio anclado en IPFS Kubo. Pruebas unitarias de splitAndApproveMilestone al 100%.',
        cidAttachment: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
        timestamp: now - 3600 * 1000 * 2,
      },
    ];
  }

  private persist(): void {
    try {
      localStorage.setItem(ORBIT_STORAGE_KEY, JSON.stringify(this.entries));
    } catch (e) {
      console.error('Error persistiendo OrbitDB EventLog:', e);
    }
  }

  private mergeRemoteEntry(entry: OrbitLogEntry, notify = true): void {
    if (!this.entries.some((e) => e.hash === entry.hash)) {
      this.entries = [entry, ...this.entries].sort((a, b) => b.timestamp - a.timestamp);
      this.persist();
      if (notify) this.notifyListeners();
    }
  }

  /**
   * Añade un nuevo evento inmutable al EventLog de OrbitDB (`db.add(event)`)
   */
  public async addEvent(params: {
    paymentId: string;
    type: OrbitEventType;
    author: string;
    role: UserRole;
    message: string;
    cidAttachment?: string;
  }): Promise<OrbitLogEntry> {
    const timestamp = Date.now();
    const rawPayload = `${params.paymentId}:${params.type}:${params.author}:${timestamp}:${params.message}`;
    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(rawPayload));
    const hex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const orbitHash = `zdpuA${hex.slice(0, 44)}`;

    const newEntry: OrbitLogEntry = {
      hash: orbitHash,
      paymentId: params.paymentId,
      type: params.type,
      author: params.author,
      role: params.role,
      message: params.message,
      cidAttachment: params.cidAttachment?.trim() || undefined,
      timestamp,
    };

    if (this.orbitInstance) {
      try {
        const realHash = await this.orbitInstance.add(newEntry);
        if (typeof realHash === 'string') {
          newEntry.hash = realHash;
        }
      } catch {
        // Fallback hash ya calculado
      }
    }

    this.entries = [newEntry, ...this.entries];
    this.persist();
    this.channel?.postMessage({ type: 'REPLICATE_ENTRY', payload: newEntry });
    this.notifyListeners();

    return newEntry;
  }

  public getEvents(paymentIdFilter?: string): OrbitLogEntry[] {
    if (!paymentIdFilter || paymentIdFilter === 'ALL') {
      return [...this.entries].sort((a, b) => b.timestamp - a.timestamp);
    }
    return this.entries
      .filter((e) => e.paymentId === paymentIdFilter)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public subscribe(listener: OrbitListener): () => void {
    this.listeners.add(listener);
    listener(this.getEvents());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const snapshot = this.getEvents();
    this.listeners.forEach((cb) => cb(snapshot));
  }
}

export const orbitService = new OrbitDBEventLogService();
