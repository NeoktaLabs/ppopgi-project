// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SingleWinnerDeployer
 * @notice
 * Deploys LotterySingleWinner instances and registers them in the LotteryRegistry.
 *
 * IMPORTANT FIX (Approval Paradox):
 * - We DO NOT pull USDC in the lottery constructor from the end-user.
 * - Instead, the end-user approves THIS Deployer for `winningPot`.
 * - The Deployer deploys the Lottery, then transfers USDC from user -> Lottery,
 *   then calls lottery.confirmFunding() to activate it.
 *
 * Why this design:
 * - No CREATE2 tricks needed.
 * - Keeps Registry "forever contract" minimal (no imports / no knowledge of types).
 * - Keeps UX manageable: creators do "Approve + Create" (standard ERC20 pattern).
 */

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "./LotteryRegistry.sol";
import "./LotterySingleWinner.sol";

contract SingleWinnerDeployer {
    using SafeERC20 for IERC20;

    // -----------------------------
    // Errors
    // -----------------------------
    error NotOwner();
    error ZeroAddress();

    // -----------------------------
    // Events
    // -----------------------------
    event DeployerOwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event ConfigUpdated(address usdc, address entropy, address provider, address feeRecipient);

    // -----------------------------
    // Ownership (owner should be your Safe)
    // -----------------------------
    address public owner;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // -----------------------------
    // Configuration (shared across all SingleWinner lotteries)
    // -----------------------------

    /// @notice Registry where lotteries are registered.
    LotteryRegistry public immutable registry;

    /// @notice The Safe that will become the owner of each lottery instance (admin knobs).
    address public immutable safeOwner;

    /// @notice Single Winner numeric type ID (choose any convention; 1 is common).
    uint256 public constant SINGLE_WINNER_TYPE_ID = 1;

    /// @notice USDC token, Entropy contract, and Entropy provider for this chain deployment.
    address public usdc;
    address public entropy;
    address public entropyProvider;

    /// @notice Protocol fee recipient (external wallet, not the Safe).
    address public feeRecipient;

    constructor(
        address _owner,
        address _registry,
        address _safeOwner,
        address _usdc,
        address _entropy,
        address _entropyProvider,
        address _feeRecipient
    ) {
        if (
            _owner == address(0) ||
            _registry == address(0) ||
            _safeOwner == address(0) ||
            _usdc == address(0) ||
            _entropy == address(0) ||
            _entropyProvider == address(0) ||
            _feeRecipient == address(0)
        ) revert ZeroAddress();

        owner = _owner;
        registry = LotteryRegistry(_registry);
        safeOwner = _safeOwner;

        usdc = _usdc;
        entropy = _entropy;
        entropyProvider = _entropyProvider;
        feeRecipient = _feeRecipient;

        emit DeployerOwnershipTransferred(address(0), _owner);
        emit ConfigUpdated(_usdc, _entropy, _entropyProvider, _feeRecipient);
    }

    /**
     * @notice Allows Safe to rotate config if needed (e.g. entropy contract upgrade),
     *         without changing registry or frontend.
     *
     * Security note:
     * - This is an admin knob, so keep owner as Safe.
     */
    function setConfig(address _usdc, address _entropy, address _entropyProvider, address _feeRecipient) external onlyOwner {
        if (_usdc == address(0) || _entropy == address(0) || _entropyProvider == address(0) || _feeRecipient == address(0)) {
            revert ZeroAddress();
        }
        usdc = _usdc;
        entropy = _entropy;
        entropyProvider = _entropyProvider;
        feeRecipient = _feeRecipient;
        emit ConfigUpdated(_usdc, _entropy, _entropyProvider, _feeRecipient);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit DeployerOwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // -----------------------------
    // Deployment Entry Point
    // -----------------------------

    /**
     * @notice Deploy + fund + register a Single Winner lottery instance.
     *
     * Creator UX:
     * 1) Approve THIS Deployer for `winningPot` USDC (if allowance < pot).
     * 2) Call createSingleWinnerLottery(...)
     *
     * Flow:
     * - Deploy lottery instance (starts in FundingPending state)
     * - Transfer USDC pot from user -> lottery
     * - Call lottery.confirmFunding() (one-time) so it becomes Open
     * - Transfer lottery ownership to Safe
     * - Register lottery in registry
     */
    function createSingleWinnerLottery(
        string calldata name,
        uint256 ticketPrice,
        uint256 winningPot,
        uint64 minTickets,
        uint64 maxTickets,
        uint64 durationSeconds,
        uint32 minPurchaseAmount
    ) external returns (address lotteryAddr) {
        // 1) Deploy new lottery instance (does NOT pull USDC pot in constructor)
        LotterySingleWinner lot = new LotterySingleWinner(
            address(registry),
            usdc,
            entropy,
            entropyProvider,
            feeRecipient,
            msg.sender, // creator
            name,
            ticketPrice,
            winningPot,
            minTickets,
            maxTickets,
            durationSeconds,
            minPurchaseAmount
        );

        // 2) Pull pot from creator directly into the new lottery instance.
        //    The creator must approve THIS deployer as spender.
        IERC20(usdc).safeTransferFrom(msg.sender, address(lot), winningPot);

        // 3) Confirm funding (activates lottery, sets reserved accounting)
        lot.confirmFunding();

        // 4) Transfer ownership to Safe (admin knobs live on Safe)
        lot.transferOwnership(safeOwner);

        lotteryAddr = address(lot);

        // 5) Register in registry (requires this deployer be authorized as registrar)
        registry.registerLottery(SINGLE_WINNER_TYPE_ID, lotteryAddr, msg.sender);
    }
}
