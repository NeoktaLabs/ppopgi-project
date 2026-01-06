// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LotteryRegistry
 * @notice A minimal, “forever” on-chain registry for lottery instances.
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
    error InvalidTypeId(); // typeId cannot be 0

    // -----------------------------
    // Events
    // -----------------------------
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event RegistrarSet(address indexed registrar, bool authorized);
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
    function setRegistrar(address registrar, bool authorized) external onlyOwner {
        if (registrar == address(0)) revert ZeroAddress();
        isRegistrar[registrar] = authorized;
        emit RegistrarSet(registrar, authorized);
    }

    // -----------------------------
    // Registration
    // -----------------------------
    function registerLottery(uint256 typeId, address lottery, address creator) external onlyRegistrar {
        if (lottery == address(0) || creator == address(0)) revert ZeroAddress();
        
        // Safety: 0 is reserved for "unregistered"
        if (typeId == 0) revert InvalidTypeId();

        // Since typeId cannot be 0, this is a safe "registered?" check.
        if (typeIdOf[lottery] != 0) revert AlreadyRegistered();

        allLotteries.push(lottery);
        typeIdOf[lottery] = typeId;
        creatorOf[lottery] = creator;
        registeredAt[lottery] = uint64(block.timestamp);

        lotteriesByType[typeId].push(lottery);

        emit LotteryRegistered(allLotteries.length - 1, typeId, lottery, creator);
    }

    // -----------------------------
    // Views
    // -----------------------------
    function isRegisteredLottery(address lottery) external view returns (bool) {
        return typeIdOf[lottery] != 0;
    }

    function getAllLotteriesCount() external view returns (uint256) {
        return allLotteries.length;
    }

    function getLotteriesByTypeCount(uint256 typeId) external view returns (uint256) {
        return lotteriesByType[typeId].length;
    }

    function getAllLotteries(uint256 start, uint256 limit) external view returns (address[] memory page) {
        uint256 n = allLotteries.length;
        if (start > n) revert InvalidPagination();

        // FIX: Must use [] brackets for array initialization
        if (start == n || limit == 0) {
            return new address[](0);
        }

        uint256 end = start + limit;
        if (end > n) end = n;

        page = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = allLotteries[i];
        }
    }

    function getLotteriesByType(uint256 typeId, uint256 start, uint256 limit)
        external
        view
        returns (address[] memory page)
    {
        address[] storage arr = lotteriesByType[typeId];
        uint256 n = arr.length;
        if (start > n) revert InvalidPagination();

        // FIX: Must use [] brackets for array initialization
        if (start == n || limit == 0) {
            return new address[](0);
        }

        uint256 end = start + limit;
        if (end > n) end = n;

        page = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            page[i - start] = arr[i];
        }
    }
}