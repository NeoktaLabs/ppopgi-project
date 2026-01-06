// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LotteryRegistry
 * @notice
 * A minimal, “forever” on-chain registry that:
 * - Stores all lottery instance addresses ever registered
 * - Stores a numeric typeId for each lottery (e.g. 1 = Single Winner)
 * - Records the creator address for UI display
 * - Allows ONLY authorized registrar contracts to register new lotteries
 * - Allows ONLY the owner (your Safe multisig) to authorize registrars
 *
 * Why this pattern:
 * - You do NOT want to redeploy the registry later (frontend stays pointed to one address).
 * - You want to add new lottery types later without changing this contract.
 * - You keep this contract extremely small to reduce attack surface long-term.
 *
 * NOTE:
 * - The registry does not contain gameplay logic.
 * - The registry does not finalize lotteries.
 * - The registry is only a “source of truth” list.
 */
contract LotteryRegistry {
    // -----------------------------
    // Errors (gas efficient)
    // -----------------------------
    error NotOwner();
    error ZeroAddress();
    error NotRegistrar();
    error InvalidPagination();
    error AlreadyRegistered();

    // -----------------------------
    // Events
    // -----------------------------
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    /// @notice A registrar contract was authorized / de-authorized by the owner (Safe).
    event RegistrarSet(address indexed registrar, bool authorized);

    /// @notice A new lottery instance was registered.
    event LotteryRegistered(
        uint256 indexed index,
        uint256 indexed typeId,
        address indexed lottery,
        address creator
    );

    // -----------------------------
    // Ownership (minimal Ownable)
    // -----------------------------
    address public owner;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(address _owner) {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
        emit OwnershipTransferred(address(0), _owner);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // -----------------------------
    // Registry State
    // -----------------------------

    /// @notice List of all lotteries ever registered (across all types).
    address[] public allLotteries;

    /// @notice Type id for each lottery address (0 means “not registered”).
    mapping(address => uint256) public typeIdOf;

    /// @notice Creator address (UI display / attribution).
    mapping(address => address) public creatorOf;

    /// @notice Timestamp when registered (helpful for UI ordering).
    mapping(address => uint64) public registeredAt;

    /// @notice Per-type list of lottery addresses.
    mapping(uint256 => address[]) internal lotteriesByType;

    /// @notice Authorized registrar contracts (deployer contracts) that can register lotteries.
    mapping(address => bool) public isRegistrar;

    modifier onlyRegistrar() {
        if (!isRegistrar[msg.sender]) revert NotRegistrar();
        _;
    }

    // -----------------------------
    // Owner-only governance
    // -----------------------------

    /**
     * @notice Owner (Safe) authorizes or removes a registrar contract.
     * @dev A "registrar" is typically a deployer contract for a given lottery type.
     */
    function setRegistrar(address registrar, bool authorized) external onlyOwner {
        if (registrar == address(0)) revert ZeroAddress();
        isRegistrar[registrar] = authorized;
        emit RegistrarSet(registrar, authorized);
    }

    // -----------------------------
    // Registration (called by registrars)
    // -----------------------------

    /**
     * @notice Register a new lottery instance.
     * @dev Only callable by authorized registrar contracts.
     *
     * @param typeId Numeric type ID (example: 1 = Single Winner)
     * @param lottery The deployed lottery instance address
     * @param creator The end-user who created this lottery (for UI)
     */
    function registerLottery(uint256 typeId, address lottery, address creator) external onlyRegistrar {
        if (lottery == address(0) || creator == address(0)) revert ZeroAddress();

        // Prevent re-registering the same address.
        // typeIdOf == 0 means “unregistered”.
        if (typeIdOf[lottery] != 0) revert AlreadyRegistered();

        // Store global list + metadata
        allLotteries.push(lottery);
        typeIdOf[lottery] = typeId;
        creatorOf[lottery] = creator;
        registeredAt[lottery] = uint64(block.timestamp);

        // Store per-type list
        lotteriesByType[typeId].push(lottery);

        emit LotteryRegistered(allLotteries.length - 1, typeId, lottery, creator);
    }

    // -----------------------------
    // Views
    // -----------------------------

    function getAllLotteriesCount() external view returns (uint256) {
        return allLotteries.length;
    }

    function getLotteriesByTypeCount(uint256 typeId) external view returns (uint256) {
        return lotteriesByType[typeId].length;
    }

    /**
     * @notice Pagination helper for all lotteries.
     * @dev Avoid returning huge arrays in a single call.
     */
    function getAllLotteries(uint256 start, uint256 limit) external view returns (address[] memory page) {
        uint256 n = allLotteries.length;
        if (start > n) revert InvalidPagination();
        if (start == n) return new address;

        uint256 end = start + limit;
        if (end > n) end = n;

        page = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = allLotteries[i];
        }
    }

    /**
     * @notice Pagination helper for lotteries by a given typeId.
     */
    function getLotteriesByType(uint256 typeId, uint256 start, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        address[] storage arr = lotteriesByType[typeId];
        uint256 n = arr.length;
        if (start > n) revert InvalidPagination();
        if (start == n) return new address;

        uint256 end = start + limit;
        if (end > n) end = n;

        page = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = arr[i];
        }
    }
}
