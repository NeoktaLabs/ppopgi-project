// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LotterySingleWinner
 * @notice A single-winner lottery instance using Pyth Entropy for randomness.
 *
 * Core properties:
 * - ONE contract instance = ONE lottery.
 * - Pull-based payouts (winner/creator/feeRecipient withdraw) to avoid push-payment risk.
 * - Permissionless finalization: anyone can call finalize() when eligible.
 * - If entropy callback never arrives, an emergency hatch allows cancellation after a delay.
 *
 * Etherlink assumptions:
 * - USDC has 6 decimals.
 *
 * Fee routing (important):
 * - Admin control (pause, entropy updates, etc.) is held by the Safe (owner()).
 * - Protocol fees are NOT allocated to the Safe; they are allocated to feeRecipient.
 * - feeRecipient is configurable by the Safe (not hardcoded).
 */

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";

interface IEntropyConsumer {
    function entropyCallback(uint64 sequenceNumber, address provider, bytes32 randomNumber) external;
}

contract LotterySingleWinner is Ownable, IEntropyConsumer, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // -----------------------------
    // Errors
    // -----------------------------
    error InvalidRegistry();
    error InvalidEntropy();
    error InvalidProvider();
    error InvalidUSDC();
    error InvalidCreator();
    error InvalidFeeRecipient();
    error NameEmpty();
    error NameTooLong();
    error DurationTooShort();
    error InvalidPrice();
    error InvalidPot();
    error InvalidMinTickets();
    error MaxLessThanMin();
    error MinPurchaseTooLarge();
    error InvalidCount();
    error BatchTooLarge();
    error BatchTooSmall();
    error BatchTooCheap();
    error TooManyRanges();
    error Overflow();
    error LotteryNotOpen();
    error LotteryExpired();
    error TicketLimitReached();
    error RequestPending();
    error NotReadyToFinalize();
    error NoParticipants();
    error InsufficientFee();
    error InvalidRequest();
    error UnauthorizedCallback();
    error NotDrawing();
    error NotCanceled();
    error CreatorCannotBuy();
    error CannotCancel();
    error EmergencyHatchLocked();
    error NothingToClaim();
    error NothingToRefund();
    error FeeTooHigh();
    error DrawingsActive();
    error EthRefundFailed();
    error AccountingMismatch();
    error Wait24Hours();

    // -----------------------------
    // Events
    // -----------------------------
    event CallbackRejected(uint64 indexed sequenceNumber, uint8 reasonCode);

    event TicketsPurchased(address indexed buyer, uint256 count, uint256 totalCost, uint256 totalSold);
    event LotteryFinalized(uint64 requestId, uint256 totalSold, address provider);
    event WinnerPicked(address indexed winner, uint256 winningTicketIndex, uint256 totalSold);

    event LotteryCanceled(string reason);
    event EmergencyRecovery();

    event RefundAllocated(address indexed user, uint256 amount);
    event FundsClaimed(address indexed user, uint256 amount);

    event EthRefundAllocated(address indexed user, uint256 amount);
    event EthClaimed(address indexed user, uint256 amount);

    event ProtocolFeesCollected(uint256 amount);

    event ProtocolFeeUpdated(uint256 newPercent);
    event EntropyProviderUpdated(address newProvider);
    event EntropyContractUpdated(address newContract);
    event GovernanceLockUpdated(uint256 activeDrawings);

    /// @notice Protocol fee recipient changed.
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    /**
     * @notice Optional UX/indexing event:
     * Emitted whenever funds are allocated to someone’s claimable balance.
     *
     * reason codes:
     * 1 = WinnerPrize
     * 2 = CreatorRevenue
     * 3 = ProtocolFee
     * 4 = CreatorPotRefund (cancel)
     * 5 = TicketRefund (cancel)
     */
    event PrizeAllocated(address indexed user, uint256 amount, uint8 reason);

    // -----------------------------
    // Immutables / Config
    // -----------------------------

    /// @notice Registry address for provenance (helps auditors & indexers).
    address public immutable registry;

    /// @notice USDC token (6 decimals assumed).
    IERC20 public immutable usdcToken;

    /// @notice Lottery creator (end-user who funded the pot).
    address public immutable creator;

    /// @notice Entropy contract/provider (admin-updatable by owner if no active drawings).
    IEntropy public entropy;
    address public entropyProvider;

    /// @notice Protocol fee percent (max 20). Allocated to feeRecipient.
    uint256 public protocolFeePercent = 5;

    /// @notice External wallet that receives protocol fees (NOT the Safe owner).
    address public feeRecipient;

    // -----------------------------
    // Limits
    // -----------------------------
    uint256 public constant MAX_BATCH_BUY = 1000;
    uint256 public constant MAX_RANGES = 50_000;

    /// @notice New buyer range must cost at least $1 (USDC 6 decimals).
    uint256 public constant MIN_NEW_RANGE_COST = 1_000_000;

    /// @notice Emergency hatch: owner/creator can cancel after 24h; public after 7 days.
    uint256 public constant PRIVILEGED_HATCH_DELAY = 1 days;
    uint256 public constant PUBLIC_HATCH_DELAY = 7 days;

    // -----------------------------
    // Accounting / Invariant
    // -----------------------------

    /**
     * @notice Liability counter.
     *
     * Intended invariant:
     *   totalReservedUSDC <= usdcToken.balanceOf(address(this))
     *
     * Increases when USDC enters the contract (pot + ticket purchases),
     * decreases only when USDC leaves the contract via withdrawFunds().
     *
     * This is a defensive “bug detector”.
     */
    uint256 public totalReservedUSDC;

    /// @notice ETH owed to users (overpayment refunds) for pull-based claiming.
    uint256 public totalClaimableEth;

    /// @notice Prevent entropy changes while a drawing is in flight.
    uint256 public activeDrawings;

    // -----------------------------
    // Lottery State
    // -----------------------------
    enum Status { Open, Drawing, Completed, Canceled }
    Status public status;

    string public name;

    uint64 public createdAt;
    uint64 public deadline;

    uint256 public ticketPrice;
    uint256 public winningPot;
    uint256 public ticketRevenue;

    uint64 public minTickets;
    uint64 public maxTickets; // 0 = unlimited
    uint32 public minPurchaseAmount;

    address public winner;

    // Randomness request tracking
    address public selectedProvider;
    uint64 public drawingRequestedAt;
    uint64 public entropyRequestId; // 0 if none active

    // -----------------------------
    // Ticket Ranges (gas-friendly cumulative ranges)
    // -----------------------------
    struct TicketRange {
        address buyer;
        uint96 upperBound; // cumulative upper bound
    }

    /// @notice Monotonic cumulative ranges list used for winner lookup by binary search.
    TicketRange[] public ticketRanges;

    /// @notice Tickets owned by a buyer (used for refunds if canceled).
    mapping(address => uint256) public ticketsOwned;

    // -----------------------------
    // Pull-based balances
    // -----------------------------
    mapping(address => uint256) public claimableFunds; // USDC
    mapping(address => uint256) public claimableEth;   // native refunds

    bool public creatorPotRefunded; // prevents double allocation on cancel

    // -----------------------------
    // Constructor (creates the lottery instance)
    // -----------------------------
    constructor(
        address _registry,
        address _usdcToken,
        address _entropy,
        address _entropyProvider,
        address _creator,
        address _feeRecipient,
        string memory _name,
        uint256 _ticketPrice,
        uint256 _winningPot,
        uint64 _minTickets,
        uint64 _maxTickets,
        uint64 _durationSeconds,
        uint32 _minPurchaseAmount
    )
        // Deployer is initial owner; deployer will transfer to Safe immediately after deployment.
        Ownable(msg.sender)
    {
        if (_registry == address(0)) revert InvalidRegistry();
        if (_entropy == address(0)) revert InvalidEntropy();
        if (_usdcToken == address(0)) revert InvalidUSDC();
        if (_entropyProvider == address(0)) revert InvalidProvider();
        if (_creator == address(0)) revert InvalidCreator();
        if (_feeRecipient == address(0)) revert InvalidFeeRecipient();

        // Validate USDC decimals = 6
        try IERC20Metadata(_usdcToken).decimals() returns (uint8 d) {
            if (d != 6) revert InvalidUSDC();
        } catch {
            revert InvalidUSDC();
        }

        // Basic validation
        if (bytes(_name).length == 0) revert NameEmpty();
        if (bytes(_name).length > 100) revert NameTooLong();
        if (_durationSeconds < 600) revert DurationTooShort(); // minimum 10 minutes
        if (_ticketPrice == 0) revert InvalidPrice();
        if (_winningPot == 0) revert InvalidPot();
        if (_minTickets == 0) revert InvalidMinTickets();
        if (_minPurchaseAmount > MAX_BATCH_BUY) revert MinPurchaseTooLarge();
        if (_maxTickets != 0 && _maxTickets < _minTickets) revert MaxLessThanMin();

        // Ensure the “$1 barrier” can be satisfied by a brand-new buyer range.
        uint256 minEntry = (_minPurchaseAmount == 0) ? 1 : uint256(_minPurchaseAmount);
        uint256 requiredMinPrice = (MIN_NEW_RANGE_COST + minEntry - 1) / minEntry;
        if (_ticketPrice < requiredMinPrice) revert BatchTooCheap();

        // Save immutables/config
        registry = _registry;
        usdcToken = IERC20(_usdcToken);
        entropy = IEntropy(_entropy);
        entropyProvider = _entropyProvider;
        creator = _creator;
        feeRecipient = _feeRecipient;

        // Initialize state
        name = _name;
        createdAt = uint64(block.timestamp);
        deadline = uint64(block.timestamp + _durationSeconds);

        ticketPrice = _ticketPrice;
        winningPot = _winningPot;
        minTickets = _minTickets;
        maxTickets = _maxTickets;
        minPurchaseAmount = _minPurchaseAmount;

        status = Status.Open;

        // Pull the pot from creator into this contract at deployment time.
        // Creator must approve USDC to THIS lottery address (created in the same transaction).
        usdcToken.safeTransferFrom(_creator, address(this), _winningPot);
        totalReservedUSDC += _winningPot;
    }

    // -----------------------------
    // Views / helpers
    // -----------------------------

    function getSold() public view returns (uint256) {
        uint256 len = ticketRanges.length;
        return len == 0 ? 0 : ticketRanges[len - 1].upperBound;
    }

    function getTicketRangesCount() external view returns (uint256) {
        return ticketRanges.length;
    }

    function getMinTicketsToBuy() external view returns (uint256) {
        uint256 minByCount = (minPurchaseAmount == 0) ? 1 : uint256(minPurchaseAmount);
        if (ticketPrice == 0) return minByCount;
        uint256 minByPrice = (MIN_NEW_RANGE_COST + ticketPrice - 1) / ticketPrice;
        return minByCount > minByPrice ? minByCount : minByPrice;
    }

    // -----------------------------
    // Buying tickets
    // -----------------------------

    /**
     * @notice Buy `count` tickets.
     *
     * Anti-spam / storage control:
     * - Each buyer gets a “range” appended when they are not the last buyer.
     * - Creating a NEW range requires at least $1 cost (MIN_NEW_RANGE_COST).
     * - If buyer is already the last buyer, we extend their last range without adding storage.
     *
     * Security pattern:
     * - CEI (Checks -> Effects -> Interactions): we update contract state first,
     *   and call the external USDC contract last.
     */
    function buyTickets(uint256 count) external nonReentrant whenNotPaused {
        // -------- CHECKS --------
        if (count == 0) revert InvalidCount();
        if (count > MAX_BATCH_BUY) revert BatchTooLarge();
        if (status != Status.Open) revert LotteryNotOpen();
        if (block.timestamp >= deadline) revert LotteryExpired();
        if (msg.sender == creator) revert CreatorCannotBuy();
        if (minPurchaseAmount > 0 && count < minPurchaseAmount) revert BatchTooSmall();

        uint256 currentSold = getSold();
        uint256 newTotal = currentSold + count;
        if (newTotal > type(uint96).max) revert Overflow();
        if (maxTickets > 0 && newTotal > maxTickets) revert TicketLimitReached();

        uint256 totalCost = ticketPrice * count;

        bool returning = (ticketRanges.length > 0 && ticketRanges[ticketRanges.length - 1].buyer == msg.sender);
        if (!returning) {
            if (ticketRanges.length >= MAX_RANGES) revert TooManyRanges();
            if (totalCost < MIN_NEW_RANGE_COST) revert BatchTooCheap();
        }

        // -------- EFFECTS --------
        totalReservedUSDC += totalCost;
        ticketRevenue += totalCost;

        if (returning) {
            ticketRanges[ticketRanges.length - 1].upperBound = uint96(newTotal);
        } else {
            ticketRanges.push(TicketRange({ buyer: msg.sender, upperBound: uint96(newTotal) }));
        }

        ticketsOwned[msg.sender] += count;

        emit TicketsPurchased(msg.sender, count, totalCost, newTotal);

        // -------- INTERACTIONS (external call LAST) --------
        // If this transfer fails, the entire tx reverts and state changes above are reverted too.
        usdcToken.safeTransferFrom(msg.sender, address(this), totalCost);
    }

    // -----------------------------
    // Finalization (request randomness)
    // -----------------------------

    /**
     * @notice Finalize once:
     * - maxTickets reached OR deadline passed
     *
     * If deadline passed and minTickets not reached:
     * - cancel and refund creator pot (creator must withdraw)
     *
     * ANYONE can call finalize when eligible (permissionless).
     * This supports automation bots without changing trust assumptions.
     */
    function finalize() external payable nonReentrant whenNotPaused {
        if (status != Status.Open) revert LotteryNotOpen();
        if (entropyRequestId != 0) revert RequestPending();

        uint256 sold = getSold();
        bool isFull = (maxTickets > 0 && sold >= maxTickets);
        bool isExpired = (block.timestamp >= deadline);

        if (!isFull && !isExpired) revert NotReadyToFinalize();

        // Expired + min not reached => cancel
        if (isExpired && sold < minTickets) {
            _cancelAndRefundCreator("Min tickets not reached");
            return;
        }

        if (sold == 0) revert NoParticipants();

        status = Status.Drawing;
        drawingRequestedAt = uint64(block.timestamp);
        selectedProvider = entropyProvider;

        // Governance lock: blocks entropy config changes mid-draw.
        activeDrawings += 1;
        emit GovernanceLockUpdated(activeDrawings);

        uint256 fee = entropy.getFee(entropyProvider);
        if (msg.value < fee) revert InsufficientFee();

        uint64 requestId = entropy.requestWithCallback{value: fee}(
            entropyProvider,
            keccak256(abi.encodePacked(address(this), block.prevrandao, block.timestamp))
        );
        if (requestId == 0) revert InvalidRequest();

        entropyRequestId = requestId;

        // Refund overpayment (pull-based fallback if direct refund fails)
        if (msg.value > fee) {
            uint256 refund = msg.value - fee;
            (bool ok, ) = payable(msg.sender).call{value: refund}("");
            if (!ok) {
                claimableEth[msg.sender] += refund;
                totalClaimableEth += refund;
                emit EthRefundAllocated(msg.sender, refund);
            }
        }

        emit LotteryFinalized(requestId, sold, entropyProvider);
    }

    // -----------------------------
    // Entropy callback => pick winner
    // -----------------------------

    function entropyCallback(uint64 sequenceNumber, address provider, bytes32 randomNumber) external override {
        if (msg.sender != address(entropy)) revert UnauthorizedCallback();
        _resolve(sequenceNumber, provider, randomNumber);
    }

    function _resolve(uint64 seq, address provider, bytes32 rand) internal {
        // Reject unknown/mismatched callbacks without reverting (prevents callback grief).
        if (entropyRequestId == 0 || seq != entropyRequestId) {
            emit CallbackRejected(seq, 1);
            return;
        }

        if (status != Status.Drawing || provider != selectedProvider) {
            emit CallbackRejected(seq, 2);
            return;
        }

        uint256 total = getSold();
        if (total == 0) {
            emit CallbackRejected(seq, 3);
            return;
        }

        // Clear request first (state hygiene)
        entropyRequestId = 0;

        // Unlock governance lock
        if (activeDrawings > 0) activeDrawings -= 1;
        emit GovernanceLockUpdated(activeDrawings);

        // Pick winner by random index
        uint256 winningIndex = uint256(rand) % total;
        address w = _findWinner(winningIndex);

        winner = w;
        status = Status.Completed;
        selectedProvider = address(0);

        // Fees
        uint256 feePot = (winningPot * protocolFeePercent) / 100;
        uint256 feeRev = (ticketRevenue * protocolFeePercent) / 100;

        // Allocate (pull payments)
        uint256 winnerAmt = (winningPot - feePot);
        claimableFunds[w] += winnerAmt;
        emit PrizeAllocated(w, winnerAmt, 1);

        uint256 creatorNet = ticketRevenue - feeRev;
        if (creatorNet > 0) {
            claimableFunds[creator] += creatorNet;
            emit PrizeAllocated(creator, creatorNet, 2);
        }

        // Protocol fees go to feeRecipient (external wallet)
        uint256 protocolAmt = feePot + feeRev;
        claimableFunds[feeRecipient] += protocolAmt;
        emit PrizeAllocated(feeRecipient, protocolAmt, 3);

        emit WinnerPicked(w, winningIndex, total);
        emit ProtocolFeesCollected(protocolAmt);
    }

    /**
     * @dev Binary search in ticketRanges for the buyer who owns winningTicket.
     */
    function _findWinner(uint256 winningTicket) internal view returns (address) {
        uint256 low = 0;
        uint256 high = ticketRanges.length - 1;

        while (low < high) {
            uint256 mid = low + (high - low) / 2;
            if (ticketRanges[mid].upperBound > winningTicket) high = mid;
            else low = mid + 1;
        }
        return ticketRanges[low].buyer;
    }

    // -----------------------------
    // Cancel & Refund paths
    // -----------------------------

    function cancel() external nonReentrant {
        if (status != Status.Open) revert CannotCancel();
        if (block.timestamp < deadline) revert CannotCancel();
        if (getSold() >= minTickets) revert CannotCancel();
        _cancelAndRefundCreator("Min tickets not reached");
    }

    /**
     * @notice If entropy callback never arrives, allow cancel:
     * - owner/creator after 24h
     * - public after 7 days
     */
    function forceCancelStuck() external nonReentrant {
        if (status != Status.Drawing) revert NotDrawing();

        bool privileged = (msg.sender == owner() || msg.sender == creator);
        if (privileged) {
            if (block.timestamp <= drawingRequestedAt + PRIVILEGED_HATCH_DELAY) revert Wait24Hours();
        } else {
            if (block.timestamp <= drawingRequestedAt + PUBLIC_HATCH_DELAY) revert EmergencyHatchLocked();
        }

        emit EmergencyRecovery();
        _cancelAndRefundCreator("Emergency Recovery");
    }

    function _cancelAndRefundCreator(string memory reason) internal {
        // Idempotency: if already canceled, do nothing
        if (status == Status.Canceled) return;

        status = Status.Canceled;
        selectedProvider = address(0);
        drawingRequestedAt = 0;

        // Clear pending entropy request
        entropyRequestId = 0;

        // Unlock lock (drawing no longer active)
        if (activeDrawings > 0) {
            activeDrawings = 0;
            emit GovernanceLockUpdated(activeDrawings);
        }

        // Refund pot to creator once (pull-based)
        if (!creatorPotRefunded && winningPot > 0) {
            creatorPotRefunded = true;

            claimableFunds[creator] += winningPot;
            emit RefundAllocated(creator, winningPot);
            emit PrizeAllocated(creator, winningPot, 4);
        }

        emit LotteryCanceled(reason);
    }

    /**
     * @notice Refund your ticket spend if lottery is canceled.
     */
    function claimTicketRefund() external nonReentrant {
        if (status != Status.Canceled) revert NotCanceled();

        uint256 tix = ticketsOwned[msg.sender];
        if (tix == 0) revert NothingToRefund();

        uint256 refund = tix * ticketPrice;
        ticketsOwned[msg.sender] = 0;

        claimableFunds[msg.sender] += refund;
        emit RefundAllocated(msg.sender, refund);
        emit PrizeAllocated(msg.sender, refund, 5);
    }

    // -----------------------------
    // Withdrawals (pull model)
    // -----------------------------

    function withdrawFunds() external nonReentrant {
        uint256 amount = claimableFunds[msg.sender];
        if (amount == 0) revert NothingToClaim();

        claimableFunds[msg.sender] = 0;
        totalReservedUSDC -= amount;

        // Invariant check (bug detector)
        if (totalReservedUSDC > usdcToken.balanceOf(address(this))) revert AccountingMismatch();

        usdcToken.safeTransfer(msg.sender, amount);
        emit FundsClaimed(msg.sender, amount);
    }

    function withdrawEth() external nonReentrant {
        uint256 amount = claimableEth[msg.sender];
        if (amount == 0) revert NothingToClaim();
        if (totalClaimableEth < amount) revert AccountingMismatch();

        claimableEth[msg.sender] = 0;
        totalClaimableEth -= amount;

        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        if (!ok) revert EthRefundFailed();

        emit EthClaimed(msg.sender, amount);
    }

    // -----------------------------
    // Admin knobs (Safe-owned)
    // -----------------------------

    /**
     * @notice Update protocol fee percent (max 20%).
     * @dev Only owner (Safe).
     */
    function setProtocolFee(uint256 p) external onlyOwner {
        if (p > 20) revert FeeTooHigh();
        protocolFeePercent = p;
        emit ProtocolFeeUpdated(p);
    }

    /**
     * @notice Update protocol fee recipient (external treasury wallet).
     * @dev Only owner (Safe). Not hardcoded; can rotate if needed.
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert InvalidFeeRecipient();
        address old = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(old, newRecipient);
    }

    function setEntropyProvider(address p) external onlyOwner {
        if (p == address(0)) revert InvalidProvider();
        if (activeDrawings != 0) revert DrawingsActive();
        entropyProvider = p;
        emit EntropyProviderUpdated(p);
    }

    function setEntropyContract(address e) external onlyOwner {
        if (e == address(0)) revert InvalidEntropy();
        if (activeDrawings != 0) revert DrawingsActive();
        entropy = IEntropy(e);
        emit EntropyContractUpdated(e);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
}
