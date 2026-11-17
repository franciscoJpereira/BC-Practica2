# Documento de Integración Frontend — Práctica 2 (DelayedPayment + IPFS + OrbitDB)

Hola, te comparto el estado del **Componente 3 (Frontend Application)** del plan acordado, las firmas exactas de ABI/eventos que ya están conectadas en la dApp y los pasos para enchufar tu despliegue de Foundry (`DelayedPayment.sol`) directamente.

---

## 1. Estado del Frontend (100% Alineado con el Plan)

El frontend ya está implementado y tipado siguiendo exactamente las especificaciones de los **Componentes 1 y 3** del plan:

1. **Dependencias y Stack (`package.json`)**:
   - `ethers@5.7.0` conectado a MetaMask (`window.ethereum`).
   - `kubo-rpc-client` apuntando al nodo local de IPFS (`http://127.0.0.1:5001/api/v0`) con réplica automática a MFS (`client.files.cp`) y resolución hacia el Gateway local (`http://127.0.0.1:8080/ipfs/<CID>`).
   - `@orbitdb/core` + `helia` + `buffer` para el `EventLog` colaborativo P2P.
2. **Estructura `src/contracts/` (Patrón Ejercicio 1)**:
   - `src/contracts/abis/DelayedPayment.json`: ABI compilado listo para reemplazar/usar con el JSON de Foundry.
   - `src/contracts/addresses.ts`: Configuración de la dirección del contrato desplegado (`addresses.delayedPayment`). También se puede cambiar en caliente desde el botón de configuración en la barra superior de la UI sin recompilar.
   - `src/contracts/index.ts`: Exportador `{ abis, addresses }` idéntico al del Ejercicio 1.
3. **Detección de Wallet y Vistas Adaptativas por Rol (`Role-Adaptive UI`)**:
   - Detecta cambios de cuenta (`accountsChanged`) y red (`chainChanged`) en MetaMask.
   - Conmutador entre **Client / Debtor Mode** y **Provider / Beneficiary Mode**.
4. **Flujo Completo del Cliente (Debtor Mode)**:
   - Subida del documento de Acuerdo de Servicio a IPFS Kubo -> obtención automática de `agreementCID`.
   - Creación del pago con `createPayment(_dueTime, _amount, _beneficiary, _agreementCID)`.
   - Opción de fondeo inmediato al crear o posterior mediante el **Modal de Fondeo (`pay(uint256 _paymentId)` payable en ETH)**.
   - Tarjeta de revisión de entregables: enlace directo al `deliverableCID` del proveedor en `http://127.0.0.1:8080/ipfs/<CID>` y modal para ejecutar **`splitAndApproveMilestone(_paymentId, _amount, _deliverableCID)`** (permite aprobar el 100% o dividir un sub-pago parcial del 25%, 50%, 75% o monto personalizado).
5. **Flujo Completo del Proveedor (Beneficiary Mode)**:
   - Listado de pagos donde figura como `beneficiary`.
   - Portal de Entrega de Hitos: subida del artefacto entregable a IPFS Kubo -> llamada a **`submitDeliverable(_paymentId, _deliverableCID)`**.
   - Botón **Claim Funds (`claim(_paymentId)`)** que verifica exactamente la invariante del plan:
     $$\text{payed} == \text{amount} \;\land\; (\text{approved} == \text{true} \;\lor\; (\text{dueTime} \le \text{block.timestamp} \;\land\; \text{deliverableCID} \neq \text{""}))$$
   - Botón **Slash Debtor (`slashPayer(_paymentId)`)** cuando el plazo vence sin estar fondeado al 100% (retrocompatibilidad con Práctica 1).
6. **Línea de Tiempo P2P con OrbitDB (`EventLog`)**:
   - Feed append-only en vivo con los 4 tipos de evento definidos en el plan: `MILESTONE_STARTED`, `PROGRESS_UPDATE`, `DELIVERABLE_SUBMITTED` y `DISPUTE_NOTE`.
   - Publica eventos automáticamente tras cada transacción on-chain y permite publicar actualizaciones manuales con CID adjunto opcional.

---

## 2. Contrato de Interfaz (Firmas que espera el Frontend de tu `DelayedPayment.sol`)

Para que el frontend y tu contrato en Foundry encajen a la primera sin tocar ni una línea adicional, el ABI del frontend está configurado con este orden exacto del `struct Payment`, funciones y eventos del **Component 1** del plan:

### 2.1. Orden de campos en `struct Payment`
```solidity
struct Payment {
    address beneficiary;
    uint256 amount;
    uint256 payed;
    uint48 dueTime;
    string agreementCID;    // Immutable IPFS CID of contract specs / terms
    string deliverableCID;  // IPFS CID of delivered work (attached upon delivery)
    bool approved;          // Indicates milestone has been reviewed and released
}
```
> **Nota importante:** El frontend lee `contract.payments(id)` esperando ese orden exacto de 7 valores devueltos por el getter público `mapping(uint256 => Payment) public payments;`, y obtiene la dirección del `debtor` a través de `ownerOf(paymentId)` (y del evento `NewPayment`).

### 2.2. Firmas de Funciones
```solidity
function createPayment(uint256 _dueTime, uint256 _amount, address _beneficiary, string calldata _agreementCID) public returns (uint256 id);
function pay(uint256 _paymentId) public payable;
function submitDeliverable(uint256 _paymentId, string calldata _deliverableCID) public;
function splitAndApproveMilestone(uint256 _paymentId, uint256 _amount, string calldata _deliverableCID) public returns (uint256 milestonePaymentId);
function claim(uint256 _paymentId) public;
function slashPayer(uint256 _paymentId) public;
function payWithPayment(uint256 _withId, uint256 _paymentId) public;
function tokenURI(uint256 _paymentId) public view override returns (string memory); // Devuelve "ipfs://<agreementCID>"
```

### 2.3. Eventos utilizados por el Frontend para indexar los tokens
El frontend reconstruye la lista de pagos consultando los logs de estos eventos desde el bloque 0:
```solidity
event NewPayment(address _beneficiary, address _debtor, uint256 _id);
event DeliverableSubmitted(uint256 indexed paymentId, string deliverableCID);
event MilestoneApproved(uint256 indexed originalPaymentId, uint256 indexed milestonePaymentId, uint256 amount, string deliverableCID);
event SplitPayment(uint256 _paymentId, uint256 _splittedId, address _debtor);
event SlashedPayer(address _payer, uint256 _id);
```

---

## 3. Cómo conectar tu despliegue de Foundry al Frontend en 2 pasos

1. Cuando despliegues `DelayedPayment.sol` en Anvil o Sepolia, copia la dirección desplegada (`0x...`) y pégala en:
   - `src/contracts/addresses.ts` (o directamente desde el icono de engranaje en la barra superior de la dApp en el navegador).
2. Si cambias algún nombre en el ABI al compilar con `forge build`, copia el array `"abi"` de `out/DelayedPayment.sol/DelayPayment.json` dentro de `src/contracts/abis/DelayedPayment.json`.
