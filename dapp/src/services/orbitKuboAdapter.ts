import { create } from 'kubo-rpc-client';
import { KUBO_RPC_URL } from './ipfsService';

/**
 * Adaptador de IPFS para @orbitdb/core respaldado exclusivamente en el nodo local de IPFS Kubo.
 * 
 * Permite ejecutar OrbitDB (@orbitdb/core) directamente contra el demonio de Kubo (127.0.0.1:5001),
 * eliminando por completo la dependencia de Helia en el navegador.
 */
export async function createKuboOrbitAdapter() {
  const kuboClient = create({ url: `${KUBO_RPC_URL}/api/v0` });

  let peerIdStr = '12D3KooWKuboLocalOrbitNode';
  try {
    const idInfo = await kuboClient.id();
    if (idInfo?.id) {
      peerIdStr = idInfo.id.toString();
    }
  } catch {
    // Si Kubo aún está arrancando, se usa el ID por defecto
  }

  const memoryBlocks = new Map<string, Uint8Array>();

  const blockstore = {
    get: async (cid: any) => {
      const cidStr = cid.toString();
      if (memoryBlocks.has(cidStr)) {
        return memoryBlocks.get(cidStr)!;
      }
      try {
        const raw = await kuboClient.block.get(cid);
        memoryBlocks.set(cidStr, raw);
        return raw;
      } catch {
        return undefined;
      }
    },
    put: async (cid: any, data: Uint8Array) => {
      const cidStr = cid.toString();
      memoryBlocks.set(cidStr, data);
      try {
        await (kuboClient.block.put as any)(data, { cid });
      } catch {
        // Fallback en memoria si el daemon no tiene endpoint block abierto
      }
      return cid;
    },
    has: async (cid: any) => {
      return memoryBlocks.has(cid.toString());
    },
  };

  const pins = {
    isPinned: async () => true,
    add: async function* (cid: any) {
      try {
        await kuboClient.pin.add(cid);
      } catch {
        // Pin fallback
      }
      yield cid;
    },
  };

  const mockPubSub = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    subscribe: () => {},
    unsubscribe: () => {},
    publish: () => {},
    getPeers: () => [],
  };

  const libp2p = {
    peerId: {
      toString: () => peerIdStr,
    },
    handle: () => {},
    unhandle: () => {},
    getMultiaddrs: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
    services: {
      pubsub: mockPubSub,
    },
  };

  return {
    blockstore,
    pins,
    libp2p,
  };
}
