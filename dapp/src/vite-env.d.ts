/// <reference types="vite/client" />

declare module '@orbitdb/core' {
  export function createOrbitDB(options: { ipfs: any; directory?: string }): Promise<{
    open: (name: string, options?: { type?: string }) => Promise<{
      address: { toString(): string };
      add: (entry: any) => Promise<string>;
      iterator: () => AsyncIterable<{ hash: string; value: any }>;
    }>;
  }>;
}
