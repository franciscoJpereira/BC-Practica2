# DelayedPayment B2B Escrow dApp (Tarea 2 - IPFS Kubo & OrbitDB)

Aplicación descentralizada modular construida con **React 18, Vite, TypeScript, Tailwind CSS, ethers.js (v5.7.0), IPFS (Kubo RPC Client) y OrbitDB (EventLog)**, diseñada para interactuar con el contrato inteligente `DelayedPayment.sol`.

## 1. Estructura del Proyecto

- [`contracts/DelayedPayment.sol`](./contracts/DelayedPayment.sol): Contrato inteligente ERC-721 con soporte para acuerdos y entregables en IPFS (`createPayment`, `submitDeliverable`, `splitAndApproveMilestone`, `claim`).
- [`src/contracts/DelayedPaymentABI.ts`](./src/contracts/DelayedPaymentABI.ts): ABI y dirección configurable del contrato.
- [`src/services/ipfsService.ts`](./src/services/ipfsService.ts): Cliente RPC conectado a Kubo local (`http://127.0.0.1:5001`) con replicación en MFS y resolución hacia el Gateway local (`http://127.0.0.1:8080/ipfs/<CID>`).
- [`src/services/orbitService.ts`](./src/services/orbitService.ts): Servicio P2P de línea de tiempo colaborativa basado en **OrbitDB (`EventLog`)** para eventos `MILESTONE_STARTED`, `PROGRESS_UPDATE` y `DISPUTE_NOTE`.
- [`src/hooks/useDelayedPayment.ts`](./src/hooks/useDelayedPayment.ts): Hook Web3 con `ethers.js v5.7.0` conectado a MetaMask (`window.ethereum`).
- [`src/components/`](./src/components/):
  - `Navbar.tsx`: Conmutador de Rol Adaptativo (Debtor / Beneficiary), estado de Kubo `:5001`, selector de dirección del contrato y conexión MetaMask.
  - `ClientDashboard.tsx`: Vista Cliente (Debtor Mode) con creación de pagos fondeados, subida de acuerdos a IPFS y tarjeta de auditoría de entregables con `splitAndApproveMilestone`.
  - `ProviderDashboard.tsx`: Vista Proveedor (Beneficiary Mode) con portal de subida de entregables (`submitDeliverable`) y botón de reclamación (`claim`).
  - `IPFSManager.tsx`: Gestor reutilizable de archivos IPFS y enlaces al Gateway `:8080`.
  - `OrbitTimeline.tsx`: Feed colaborativo P2P basado en OrbitDB `EventLog`.
  - `SplitApproveModal.tsx` & `NFTBadgeModal.tsx`: Modales para recorte/aprobación de sub-pagos e inspección del NFT ERC-721 (`tokenURI`).

## 2. Configuración de CORS para el Nodo Local de IPFS (Kubo)

Para permitir que la dApp suba archivos directamente a `http://127.0.0.1:5001`, ejecuta en tu terminal:

```bash
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:5173", "http://127.0.0.1:5173", "*"]'
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT", "POST", "GET"]'
ipfs daemon
```

## 3. Instalación y Ejecución

```bash
cd practica-2/delayed-payment-dapp
npm install
npm run dev
```
