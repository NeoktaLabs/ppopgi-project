// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SingleWinnerDeployer
 * @notice
 * Deploys LotterySingleWinner instances and registers them in the LotteryRegistry.
 *
 * Key points:
 * - This contract must be authorized as a registrar in the LotteryRegistry.
 * - Users call createSingleWinnerLottery(...) here.
 * - This deployer:
 *    1) deploys a new LotterySingleWinner instance
 *    2) transfers ownership of the lottery to the Safe (admin knobs)
 *    3) registers the lottery in the registry (typeId = 1)
 *
 * Fee routing:
 * - Protocol fees do NOT go to the Safe multisig.
 * - Protocol fees are allocated to feeRecipient (external wallet),
 *   while admin control remains on the Safe (owner).
 *
 * Why deployer contract:
 * - The registry stays minimal and doesn't import lottery implementations.
 * - You can add new lottery types later by deploying new deployers and authorizing them.
 */

import "./LotteryRegistry.sol";
import "./LotterySingleWinner.sol";

contract SingleWinnerDeployer {
    // -----------------------------
    // Errors
    // -----------------------------
    error NotOwner();
    error ZeroAddress();

    // -----------------------------
    // Events
    // -----------------------------
    event DeployerOwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    /// @notice Emitted when deployer-level config changes.
    event ConfigUpdated(address usdc, address entropy, address provider, address safeOwner, address feeRecipient);

    // -----------------------------
    // Ownership (owner should be your Safe)
    // -----------------------------
    address public owner;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // -----------------------------
    // Immutable / core wiring
    // -----------------------------
    LotteryRegistry public immutable registry;

    /// @notice Numeric type id for this deployer’s lotteries.
    uint256 public constant SINGLE_WINNER_TYPE_ID = 1;

    // -----------------------------
    // Config (shared across all SingleWinner lotteries)
    // -----------------------------
    address public safeOwner;     // admin owner of each lottery instance
    address public feeRecipient;  // protocol fee recipient (external wallet)

    address public usdc;
    address public entropy;
    address public entropyProvider;

    constructor(
        address _owner,
        address _registry,
        address _safeOwner,
        address _feeRecipient,
        address _usdc,
        address _entropy,
        address _entropyProvider
    ) {
        if (
            _owner == address(0) ||
            _registry == address(0) ||
            _safeOwner == address(0) ||
            _feeRecipient == address(0) ||
            _usdc == address(0) ||
            _entropy == address(0) ||
            _entropyProvider == address(0)
        ) revert ZeroAddress();

        owner = _owner;
        registry = LotteryRegistry(_registry);

        safeOwner = _safeOwner;
        feeRecipient = _feeRecipient;

        usdc = _usdc;
        entropy = _entropy;
        entropyProvider = _entropyProvider;

        emit DeployerOwnershipTransferred(address(0), _owner);
        emit ConfigUpdated(_usdc, _entropy, _entropyProvider, _safeOwner, _feeRecipient);
    }

    /**
     * @notice Allows the Safe (owner) to rotate config if needed:
     * - USDC / Entropy / Provider changes (chain/environment upgrades)
     * - Safe owner address changes (e.g. Safe migration)
     * - Fee recipient changes (treasury rotation)
     */
    function setConfig(
        address _usdc,
        address _entropy,
        address _entropyProvider,
        address _safeOwner,
        address _feeRecipient
    ) external onlyOwner {
        if (
            _usdc == address(0) ||
            _entropy == address(0) ||
            _entropyProvider == address(0) ||
            _safeOwner == address(0) ||
            _feeRecipient == address(0)
        ) revert ZeroAddress();

        usdc = _usdc;
        entropy = _entropy;
        entropyProvider = _entropyProvider;

        safeOwner = _safeOwner;
        feeRecipient = _feeRecipient;

        emit ConfigUpdated(_usdc, _entropy, _entropyProvider, _safeOwner, _feeRecipient);
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
     * @notice Deploy and register a Single Winner lottery instance (ONE instance = ONE lottery).
     *
     * UX:
     * - The creator calls this once. The lottery instance is deployed + registered.
     * - The creator must have approved USDC to the NEW lottery address inside the constructor flow.
     *
     * Important:
     * - The lottery constructor pulls winningPot from the creator immediately.
     * - After deployment, we transfer admin ownership to the Safe.
     * - Protocol fees are allocated to feeRecipient (external treasury).
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
        // Deploy new instance. Deployer is temporary owner, then transfers to Safe.
        LotterySingleWinner lot = new LotterySingleWinner(
            address(registry),
            usdc,
            entropy,
            entropyProvider,
            msg.sender,       // creator
            feeRecipient,     // external protocol fee wallet
            name,
            ticketPrice,
            winningPot,
            minTickets,
            maxTickets,
            durationSeconds,
            minPurchaseAmount
        );

        // Transfer admin ownership to Safe (admin knobs: pause, entropy updates, fee recipient update, etc.)
        lot.transferOwnership(safeOwner);

        lotteryAddr = address(lot);

        // Register in registry (requires this deployer to be authorized registrar).
        registry.registerLottery(SINGLE_WINNER_TYPE_ID, lotteryAddr, msg.sender);
    }
}
