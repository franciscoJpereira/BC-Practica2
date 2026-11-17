/**
 * Polyfill local para 'it-drain', requerido internamente por @orbitdb/core (ipfs-block.js).
 * Evita tener que añadir dependencias externas tras eliminar helia.
 */
export default async function drain(source: any): Promise<void> {
  if (!source) return;
  for await (const _ of source) {
    // vaciar iterador asíncrono
  }
}
