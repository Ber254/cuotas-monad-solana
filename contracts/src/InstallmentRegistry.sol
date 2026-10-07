// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title InstallmentRegistry
/// @notice Registro on-chain (Monad) de obligaciones de pago en cuotas.
///         No custodia fondos: el pago real ocurre en Solana (USDC) y un
///         `verifier` (o el acreedor del pagaré) lo registra acá como PAID.
///         Cada cuota es un pagaré cuyo acreedor puede cederse a un tercero (`transferInstallments`).
contract InstallmentRegistry {
    enum InstallmentStatus {
        PENDING,
        PAID,
        OVERDUE
    }

    enum ObligationStatus {
        ACTIVE,
        COMPLETED
    }

    struct Obligation {
        uint256 id;
        string description;
        address seller;
        address buyer;
        /// Pubkey Solana (base58) del vendedor que recibe los USDC.
        string sellerSolanaAddress;
        /// Monto por cuota en unidades mínimas de USDC (6 decimales).
        uint256 installmentAmount;
        uint8 installmentCount;
        uint8 paidCount;
        uint64 firstDueDate;
        /// Segundos entre vencimientos (mensual = 30 días).
        uint64 interval;
        uint64 createdAt;
        ObligationStatus status;
    }

    struct Installment {
        uint256 obligationId;
        uint8 number;
        uint256 amount;
        uint64 dueDate;
        bool paid;
        uint64 paidAt;
        /// Referencia del pago (firma de la tx en Solana).
        string paymentRef;
        /// Acreedor actual si el pagaré fue cedido; address(0) = el vendedor original (ahorra gas al crear).
        address creditor;
        /// Cuenta Solana donde cobra el acreedor cedido; vacío = la del vendedor original.
        string creditorSolanaAddress;
    }

    /// Vista de una cuota con estado derivado y partes de la obligación.
    struct InstallmentView {
        uint256 obligationId;
        uint8 number;
        uint256 amount;
        uint64 dueDate;
        InstallmentStatus status;
        uint64 paidAt;
        string paymentRef;
        address buyer;
        /// Vendedor original que creó la obligación.
        address seller;
        /// Acreedor ACTUAL del pagaré (= seller salvo que se haya cedido).
        address creditor;
        /// Cuenta Solana donde debe pagarse ESTE pagaré (la del acreedor actual).
        string creditorSolanaAddress;
    }

    uint8 public constant MAX_INSTALLMENTS = 60;

    address public owner;
    address public verifier;
    uint256 public obligationCount;

    mapping(uint256 => Obligation) private _obligations;
    mapping(uint256 => mapping(uint8 => Installment)) private _installments;
    mapping(bytes32 => bool) public usedPaymentRefs;
    mapping(address => uint256[]) private _byBuyer;
    mapping(address => uint256[]) private _bySeller;
    /// Obligaciones donde la dirección recibió algún pagaré por cesión (puede haberlo vuelto a ceder).
    mapping(address => uint256[]) private _byCreditor;
    mapping(address => mapping(uint256 => bool)) private _creditorSeen;

    event ObligationCreated(
        uint256 indexed obligationId,
        address indexed seller,
        address indexed buyer,
        uint256 installmentAmount,
        uint8 installmentCount,
        uint64 firstDueDate,
        uint64 interval
    );
    event InstallmentPaid(uint256 indexed obligationId, uint8 indexed number, string paymentRef, address markedBy);
    event InstallmentTransferred(
        uint256 indexed obligationId, uint8 indexed number, address indexed to, address from, string toSolanaAddress
    );
    event ObligationCompleted(uint256 indexed obligationId);
    event VerifierChanged(address indexed previous, address indexed current);

    error NotOwner();
    error NotAuthorized();
    error InvalidParams();
    error ObligationNotFound();
    error InstallmentNotFound();
    error AlreadyPaid();
    error PaymentRefAlreadyUsed();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address initialVerifier) {
        owner = msg.sender;
        verifier = initialVerifier;
        emit VerifierChanged(address(0), initialVerifier);
    }

    function setVerifier(address newVerifier) external onlyOwner {
        emit VerifierChanged(verifier, newVerifier);
        verifier = newVerifier;
    }

    /// @notice Crea una obligación y genera todas sus cuotas. La crea el vendedor.
    function createObligation(
        string calldata description,
        address buyer,
        string calldata sellerSolanaAddress,
        uint256 installmentAmount,
        uint8 installmentCount,
        uint64 firstDueDate,
        uint64 interval
    ) external returns (uint256 obligationId) {
        if (
            buyer == address(0) || buyer == msg.sender || installmentAmount == 0 || installmentCount == 0
                || installmentCount > MAX_INSTALLMENTS || firstDueDate == 0 || (installmentCount > 1 && interval == 0)
                || bytes(sellerSolanaAddress).length == 0
        ) revert InvalidParams();

        obligationId = ++obligationCount;
        _obligations[obligationId] = Obligation({
            id: obligationId,
            description: description,
            seller: msg.sender,
            buyer: buyer,
            sellerSolanaAddress: sellerSolanaAddress,
            installmentAmount: installmentAmount,
            installmentCount: installmentCount,
            paidCount: 0,
            firstDueDate: firstDueDate,
            interval: interval,
            createdAt: uint64(block.timestamp),
            status: ObligationStatus.ACTIVE
        });

        for (uint8 n = 1; n <= installmentCount; n++) {
            _installments[obligationId][n] = Installment({
                obligationId: obligationId,
                number: n,
                amount: installmentAmount,
                dueDate: firstDueDate + uint64(n - 1) * interval,
                paid: false,
                paidAt: 0,
                paymentRef: "",
                creditor: address(0),
                creditorSolanaAddress: ""
            });
        }

        _byBuyer[buyer].push(obligationId);
        _bySeller[msg.sender].push(obligationId);

        emit ObligationCreated(
            obligationId, msg.sender, buyer, installmentAmount, installmentCount, firstDueDate, interval
        );
    }

    /// @notice Marca una cuota como pagada. Solo `verifier` (confirmación del pago
    ///         en Solana) o el ACREEDOR ACTUAL de ese pagaré (confirmación manual).
    function markInstallmentPaid(uint256 obligationId, uint8 number, string calldata paymentRef) external {
        Obligation storage o = _obligations[obligationId];
        if (o.id == 0) revert ObligationNotFound();
        if (number == 0 || number > o.installmentCount) revert InstallmentNotFound();
        Installment storage inst = _installments[obligationId][number];
        // Solo el verifier o el ACREEDOR ACTUAL de este pagaré (si fue cedido, ya no el vendedor original).
        if (msg.sender != verifier && msg.sender != _creditorOf(o, inst)) revert NotAuthorized();
        if (bytes(paymentRef).length == 0) revert InvalidParams();
        if (inst.paid) revert AlreadyPaid();

        bytes32 refHash = keccak256(bytes(paymentRef));
        if (usedPaymentRefs[refHash]) revert PaymentRefAlreadyUsed();
        usedPaymentRefs[refHash] = true;

        inst.paid = true;
        inst.paidAt = uint64(block.timestamp);
        inst.paymentRef = paymentRef;
        o.paidCount += 1;

        emit InstallmentPaid(obligationId, number, paymentRef, msg.sender);

        if (o.paidCount == o.installmentCount) {
            o.status = ObligationStatus.COMPLETED;
            emit ObligationCompleted(obligationId);
        }
    }

    /// @notice Cede pagarés (cuotas impagas) de los que sos acreedor a otra dirección. El comprador (deudor)
    ///         no puede ser acreedor de su propia deuda. El acuerdo comercial (precio de la cesión) es off-chain.
    ///         Desde la cesión, el pago debe hacerse a `newCreditorSolanaAddress`.
    function transferInstallments(
        uint256 obligationId,
        uint8[] calldata numbers,
        address newCreditor,
        string calldata newCreditorSolanaAddress
    ) external {
        Obligation storage o = _obligations[obligationId];
        if (o.id == 0) revert ObligationNotFound();
        if (
            numbers.length == 0 || numbers.length > MAX_INSTALLMENTS || newCreditor == address(0)
                || newCreditor == o.buyer || bytes(newCreditorSolanaAddress).length == 0
        ) revert InvalidParams();
        for (uint256 i = 0; i < numbers.length; i++) {
            uint8 n = numbers[i];
            if (n == 0 || n > o.installmentCount) revert InstallmentNotFound();
            Installment storage inst = _installments[obligationId][n];
            if (inst.paid) revert AlreadyPaid();
            address from = _creditorOf(o, inst);
            if (from != msg.sender) revert NotAuthorized();
            if (newCreditor == from) revert InvalidParams();
            inst.creditor = newCreditor;
            inst.creditorSolanaAddress = newCreditorSolanaAddress;
            emit InstallmentTransferred(obligationId, n, newCreditor, from, newCreditorSolanaAddress);
        }
        if (!_creditorSeen[newCreditor][obligationId]) {
            _creditorSeen[newCreditor][obligationId] = true;
            _byCreditor[newCreditor].push(obligationId);
        }
    }

    function getObligation(uint256 obligationId) external view returns (Obligation memory) {
        Obligation memory o = _obligations[obligationId];
        if (o.id == 0) revert ObligationNotFound();
        return o;
    }

    function getInstallment(uint256 obligationId, uint8 number) public view returns (InstallmentView memory) {
        Obligation storage o = _obligations[obligationId];
        if (o.id == 0) revert ObligationNotFound();
        if (number == 0 || number > o.installmentCount) revert InstallmentNotFound();
        Installment storage inst = _installments[obligationId][number];
        return InstallmentView({
            obligationId: obligationId,
            number: number,
            amount: inst.amount,
            dueDate: inst.dueDate,
            status: _status(inst),
            paidAt: inst.paidAt,
            paymentRef: inst.paymentRef,
            buyer: o.buyer,
            seller: o.seller,
            creditor: _creditorOf(o, inst),
            creditorSolanaAddress: bytes(inst.creditorSolanaAddress).length == 0
                ? o.sellerSolanaAddress
                : inst.creditorSolanaAddress
        });
    }

    function getInstallments(uint256 obligationId) external view returns (InstallmentView[] memory list) {
        Obligation storage o = _obligations[obligationId];
        if (o.id == 0) revert ObligationNotFound();
        list = new InstallmentView[](o.installmentCount);
        for (uint8 n = 1; n <= o.installmentCount; n++) {
            list[n - 1] = getInstallment(obligationId, n);
        }
    }

    function getObligationsByBuyer(address buyer) external view returns (uint256[] memory) {
        return _byBuyer[buyer];
    }

    function getObligationsBySeller(address seller) external view returns (uint256[] memory) {
        return _bySeller[seller];
    }

    /// Obligaciones donde `creditor` recibió algún pagaré por cesión (revisar `getInstallments` para ver cuáles tiene hoy).
    function getObligationsByCreditor(address creditor) external view returns (uint256[] memory) {
        return _byCreditor[creditor];
    }

    function _creditorOf(Obligation storage o, Installment storage inst) private view returns (address) {
        return inst.creditor == address(0) ? o.seller : inst.creditor;
    }

    /// OVERDUE se deriva al leer (no se persiste): impaga y vencida.
    function _status(Installment storage inst) private view returns (InstallmentStatus) {
        if (inst.paid) return InstallmentStatus.PAID;
        if (block.timestamp > inst.dueDate) return InstallmentStatus.OVERDUE;
        return InstallmentStatus.PENDING;
    }
}
