// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

interface PaymentErrors {
    error OverpaymentError(uint256 amount, uint256 owed);
    error UnmaturedPayment(uint256 dueTime);
    error Unpayed(uint256 paymentId);
    error Payed(uint256 paymentId);
    error SlashedDebtor(address _debtor);
    error NotBeneficiary(address caller, uint256 paymentId);
    error NotYourDebt(address caller, uint256 paymentId);
    error NotInTime();
    error InvalidAgreementCID();
    error InvalidDeliverableCID();
}

/**
 * @title DelayedPayment (v2 - IPFS & Milestone Escrow Edition)
 * @notice Contrato ERC721 de pagos diferidos y escrow por hitos con soporte nativo para CIDs de IPFS
 *         (Acuerdos de servicio y Entregables verificables).
 */
contract DelayedPayment is ERC721 {
    struct Payment {
        address beneficiary;
        address debtor;
        uint256 amount;
        uint256 payed;
        uint48 dueTime;
        bool approved;
        string agreementCID;
        string deliverableCID;
    }

    event NewPayment(
        address indexed _beneficiary,
        address indexed _debtor,
        uint256 indexed _id,
        uint256 _amount,
        uint256 _dueTime,
        string _agreementCID
    );
    event DeliverableSubmitted(
        uint256 indexed _paymentId,
        address indexed _beneficiary,
        string _deliverableCID
    );
    event MilestoneApproved(
        uint256 indexed _paymentId,
        uint256 indexed _approvedPaymentId,
        uint256 _amount,
        string _deliverableCID
    );
    event SplitPayment(
        uint256 indexed _paymentId,
        uint256 indexed _splittedId,
        address indexed _debtor,
        uint256 _amount
    );
    event PaymentClaimed(
        uint256 indexed _paymentId,
        address indexed _beneficiary,
        uint256 _amount
    );
    event SlashedPayer(address indexed _payer, uint256 indexed _id);

    mapping(uint256 => Payment) public payments;
    mapping(address => uint256) public slashed;

    uint256 private _counter;
    uint256[] private _allPaymentIds;

    constructor() ERC721("DelayedPayments", "DPA") payable {
        _counter = 0;
    }

    modifier unslashed(address _debtor) {
        if (slashed[_debtor] > 0) {
            revert PaymentErrors.SlashedDebtor(_debtor);
        }
        _;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "ipfs://";
    }

    /**
     * @notice Devuelve la URI del token ERC721 priorizando el entregable certificado o el acuerdo inicial en IPFS.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        Payment memory p = payments[tokenId];
        string memory cid = bytes(p.deliverableCID).length > 0 ? p.deliverableCID : p.agreementCID;
        return string(abi.encodePacked(_baseURI(), cid));
    }

    /**
     * @notice Permite al Cliente (debtor) crear un pago asegurado en escrow adjuntando el CID del acuerdo en IPFS
     *         y opcionalmente fondeándolo en la misma transacción (msg.value).
     */
    function createPayment(
        uint256 _dueTime,
        uint256 _amount,
        address _beneficiary,
        string calldata _agreementCID
    ) public payable unslashed(msg.sender) returns (uint256 id) {
        if (block.timestamp > _dueTime) {
            revert PaymentErrors.NotInTime();
        }
        if (bytes(_agreementCID).length == 0) {
            revert PaymentErrors.InvalidAgreementCID();
        }
        if (msg.value > _amount) {
            revert PaymentErrors.OverpaymentError(msg.value, _amount);
        }

        uint256 _id = uint256(keccak256(abi.encodePacked(msg.sender, _counter, block.timestamp)));
        _counter += 1;

        payments[_id] = Payment({
            beneficiary: _beneficiary,
            debtor: msg.sender,
            amount: _amount,
            payed: msg.value,
            dueTime: uint48(_dueTime),
            approved: false,
            agreementCID: _agreementCID,
            deliverableCID: ""
        });

        _allPaymentIds.push(_id);
        _safeMint(msg.sender, _id);

        emit NewPayment(_beneficiary, msg.sender, _id, _amount, _dueTime, _agreementCID);
        return _id;
    }

    /**
     * @notice Permite fondear adicionalmente un pago existente en escrow.
     */
    function pay(uint256 _paymentId) public payable {
        address _owner = ownerOf(_paymentId);
        Payment storage payment = payments[_paymentId];
        if (msg.sender != _owner && msg.sender != payment.debtor) {
            revert PaymentErrors.NotYourDebt(msg.sender, _paymentId);
        }
        if (msg.value > (payment.amount - payment.payed)) {
            revert PaymentErrors.OverpaymentError(msg.value, payment.amount - payment.payed);
        }
        payment.payed += msg.value;
    }

    /**
     * @notice Permite al Proveedor (beneficiary) subir y registrar el comprobante/entregable del hito en IPFS.
     */
    function submitDeliverable(uint256 _paymentId, string calldata _deliverableCID) public {
        ownerOf(_paymentId);
        Payment storage payment = payments[_paymentId];
        if (msg.sender != payment.beneficiary) {
            revert PaymentErrors.NotBeneficiary(msg.sender, _paymentId);
        }
        if (bytes(_deliverableCID).length == 0) {
            revert PaymentErrors.InvalidDeliverableCID();
        }

        payment.deliverableCID = _deliverableCID;
        emit DeliverableSubmitted(_paymentId, msg.sender, _deliverableCID);
    }

    /**
     * @notice Permite al Cliente revisar el entregable, recortar un sub-pago aprobado (o aprobar el total)
     *         para liberación inmediata y marcar el token como aprobado.
     */
    function splitAndApproveMilestone(
        uint256 _paymentId,
        uint256 _amount,
        string calldata _deliverableCID
    ) public returns (uint256 approvedPaymentId) {
        address _owner = ownerOf(_paymentId);
        Payment storage original = payments[_paymentId];

        if (msg.sender != _owner && msg.sender != original.debtor) {
            revert PaymentErrors.NotYourDebt(msg.sender, _paymentId);
        }
        if (_amount == 0 || _amount > original.amount) {
            revert PaymentErrors.OverpaymentError(_amount, original.amount);
        }

        string memory finalDeliverable = bytes(_deliverableCID).length > 0
            ? _deliverableCID
            : original.deliverableCID;

        // Si aprueba el 100% del monto restante, aprueba directamente el token actual para liberación inmediata
        if (_amount == original.amount) {
            original.deliverableCID = finalDeliverable;
            original.approved = true;
            emit MilestoneApproved(_paymentId, _paymentId, _amount, finalDeliverable);
            return _paymentId;
        }

        // Si recorta un sub-pago parcial (hito), descuenta del principal y acuña un nuevo token aprobado
        uint256 fundedPortion = 0;
        if (original.payed >= _amount) {
            fundedPortion = _amount;
            original.payed -= _amount;
        } else {
            fundedPortion = original.payed;
            original.payed = 0;
        }
        original.amount -= _amount;

        uint256 newId = uint256(keccak256(abi.encodePacked(msg.sender, _counter, block.timestamp)));
        _counter += 1;

        payments[newId] = Payment({
            beneficiary: original.beneficiary,
            debtor: original.debtor,
            amount: _amount,
            payed: fundedPortion,
            dueTime: uint48(block.timestamp), // Liberación inmediata habilitada
            approved: true,
            agreementCID: original.agreementCID,
            deliverableCID: finalDeliverable
        });

        _allPaymentIds.push(newId);
        _safeMint(_owner, newId);

        emit SplitPayment(_paymentId, newId, _owner, _amount);
        emit MilestoneApproved(_paymentId, newId, _amount, finalDeliverable);
        return newId;
    }

    /**
     * @notice Permite al Proveedor reclamar fondos cuando el hito está aprobado o ha vencido el plazo.
     */
    function claim(uint256 _paymentId) public {
        address _owner = ownerOf(_paymentId);
        Payment memory payment = payments[_paymentId];

        if (payment.beneficiary != msg.sender) {
            revert PaymentErrors.NotBeneficiary(msg.sender, _paymentId);
        }
        if (!payment.approved && payment.dueTime > block.timestamp) {
            revert PaymentErrors.UnmaturedPayment(payment.dueTime);
        }
        if (payment.payed < payment.amount) {
            revert PaymentErrors.Unpayed(_paymentId);
        }

        _burn(_paymentId);

        (bool success, ) = msg.sender.call{value: payment.amount}("");
        require(success, "ETH transfer failed");

        if (slashed[_owner] > 0) {
            slashed[_owner] -= 1;
        }

        emit PaymentClaimed(_paymentId, msg.sender, payment.amount);
    }

    /**
     * @notice Penaliza al deudor si un pago venció sin estar fondeado al 100%.
     */
    function slashPayer(uint256 _paymentId) public {
        address _owner = ownerOf(_paymentId);
        Payment memory _payment = payments[_paymentId];
        if (_payment.payed == _payment.amount) {
            revert PaymentErrors.Payed(_paymentId);
        }
        if (_payment.dueTime >= block.timestamp) {
            revert PaymentErrors.UnmaturedPayment(_payment.dueTime);
        }
        slashed[_owner] += 1;
        emit SlashedPayer(_owner, _paymentId);
    }

    /**
     * @notice Devuelve todos los IDs de pagos registrados para facilitar la indexación en el frontend.
     */
    function getAllPaymentIds() external view returns (uint256[] memory) {
        return _allPaymentIds;
    }
}
