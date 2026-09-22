// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LaunchToken} from "./LaunchToken.sol";

/// @title Launchpad
/// @notice A minimal token launchpad. Anyone can create a fixed-supply ERC20 that is sold
///         along a linear bonding curve. The spot price of a token grows with the number of
///         tokens sold: `price(s) = basePrice + slope * s / 1e18` (wei per whole token).
///
///         Buying spends ETH and mints tokens out of the launchpad's inventory, selling burns
///         the bought tokens and returns ETH from the curve reserve. A trade fee is split
///         between the token creator and the protocol.
contract Launchpad is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant WAD = 1e18;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_TRADE_FEE_BPS = 1_000; // 10%

    struct Launch {
        address token;
        address creator;
        uint256 totalSupply;
        uint256 tokensSold;
        uint256 ethReserve;
        uint256 basePrice; // wei per whole token when no tokens are sold
        uint256 slope; // wei added to the price per whole token sold
        uint256 buyTaxBps; // tax on buys, in basis points
        uint256 sellTaxBps; // tax on sells, in basis points
        bool graduated; // true once the whole supply has been sold
    }

    /// @notice Recipient of the protocol share of fees.
    address public feeRecipient;

    /// @notice Flat ETH fee charged to create a launch.
    uint256 public creationFee;

    /// @notice Number of launches created so far. Launch ids start at 1.
    uint256 public launchCount;

    /// @notice Launch data by id.
    mapping(uint256 => Launch) public launches;

    /// @notice Launch id for a token (0 if the token was not created here).
    mapping(address => uint256) public tokenToId;

    /// @notice Claimable fees per creator.
    mapping(address => uint256) public creatorFees;

    /// @notice Unclaimed protocol fees.
    uint256 public protocolFees;

    event Launched(
        uint256 indexed id,
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        uint256 totalSupply,
        uint256 basePrice,
        uint256 slope,
        uint256 buyTaxBps,
        uint256 sellTaxBps
    );
    event Bought(
        uint256 indexed id, address indexed buyer, uint256 tokensOut, uint256 ethSpent, uint256 fee
    );
    event Sold(
        uint256 indexed id, address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 fee
    );
    event Graduated(uint256 indexed id, address indexed token);
    event CreatorFeesClaimed(address indexed creator, uint256 amount);
    event ProtocolFeesWithdrawn(address indexed recipient, uint256 amount);

    error ZeroAddress();
    error InvalidParams();
    error LaunchNotFound();
    error SoldOut();
    error ZeroValue();
    error InsufficientValue();
    error FeeTooHigh();
    error NoFees();
    error TransferFailed();

    constructor(address initialOwner, address feeRecipient_, uint256 creationFee_)
        Ownable(initialOwner)
    {
        if (feeRecipient_ == address(0)) revert ZeroAddress();
        feeRecipient = feeRecipient_;
        creationFee = creationFee_;
    }

    // ---------------------------------------------------------------------
    // Launch management
    // ---------------------------------------------------------------------

    /// @notice Create a new token launch.
    /// @param name Token name.
    /// @param symbol Token symbol.
    /// @param totalSupply Total (fixed) supply, must be a whole number of tokens.
    /// @param basePrice Starting price in wei per whole token.
    /// @param slope Price increase in wei per whole token sold.
    /// @param buyTaxBps Tax charged on buys, in basis points.
    /// @param sellTaxBps Tax charged on sells, in basis points.
    function createLaunch(
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        uint256 basePrice,
        uint256 slope,
        uint256 buyTaxBps,
        uint256 sellTaxBps
    ) external payable nonReentrant returns (address token, uint256 id) {
        if (bytes(name).length == 0 || bytes(symbol).length == 0) {
            revert InvalidParams();
        }
        if (totalSupply == 0 || totalSupply % WAD != 0) revert InvalidParams();
        if (basePrice == 0 || slope == 0) revert InvalidParams();
        if (buyTaxBps > MAX_TRADE_FEE_BPS || sellTaxBps > MAX_TRADE_FEE_BPS) revert FeeTooHigh();
        if (msg.value != creationFee) revert InsufficientValue();

        LaunchToken created = new LaunchToken(name, symbol, totalSupply, msg.sender);
        token = address(created);
        id = ++launchCount;

        launches[id] = Launch({
            token: token,
            creator: msg.sender,
            totalSupply: totalSupply,
            tokensSold: 0,
            ethReserve: 0,
            basePrice: basePrice,
            slope: slope,
            buyTaxBps: buyTaxBps,
            sellTaxBps: sellTaxBps,
            graduated: false
        });
        tokenToId[token] = id;

        if (msg.value > 0) {
            protocolFees += msg.value;
        }

        emit Launched(
            id,
            token,
            msg.sender,
            name,
            symbol,
            totalSupply,
            basePrice,
            slope,
            buyTaxBps,
            sellTaxBps
        );
    }

    // ---------------------------------------------------------------------
    // Trading
    // ---------------------------------------------------------------------

    /// @notice Buy tokens from a launch with ETH. Any ETH that cannot be spent (because the
    ///         launch sells out mid-transaction) is refunded.
    /// @param id Launch id.
    function buy(uint256 id) external payable nonReentrant {
        Launch storage l = launches[id];
        if (l.token == address(0)) revert LaunchNotFound();
        if (msg.value == 0) revert ZeroValue();
        if (l.tokensSold >= l.totalSupply) revert SoldOut();

        uint256 remaining = l.totalSupply - l.tokensSold;

        uint256 fee = (msg.value * l.buyTaxBps) / BPS_DENOMINATOR;
        uint256 curveEth = msg.value - fee;
        uint256 tokensOut = _tokensForEth(l.tokensSold, curveEth, l.basePrice, l.slope);

        uint256 spend;
        uint256 refund = 0;

        if (tokensOut > remaining) {
            tokensOut = remaining;
            spend = _costToBuy(l.tokensSold, tokensOut, l.basePrice, l.slope);
            fee = (spend * l.buyTaxBps) / BPS_DENOMINATOR;
            refund = msg.value - spend - fee;
        } else {
            spend = curveEth;
        }

        if (tokensOut == 0) revert ZeroValue();

        l.tokensSold += tokensOut;
        l.ethReserve += spend;

        if (l.tokensSold == l.totalSupply) {
            l.graduated = true;
            emit Graduated(id, l.token);
        }

        _splitFee(l.creator, fee);
        emit Bought(id, msg.sender, tokensOut, spend, fee);

        IERC20(l.token).safeTransfer(msg.sender, tokensOut);

        if (refund > 0) {
            _sendValue(msg.sender, refund);
        }
    }

    /// @notice Sell tokens back to a launch's curve for ETH.
    /// @param id Launch id.
    /// @param amount Amount of tokens to sell.
    function sell(uint256 id, uint256 amount) external nonReentrant {
        Launch storage l = launches[id];
        if (l.token == address(0)) revert LaunchNotFound();
        if (amount == 0) revert ZeroValue();
        if (amount > l.tokensSold) revert InsufficientValue();

        IERC20(l.token).safeTransferFrom(msg.sender, address(this), amount);

        uint256 gross = _proceedsForSell(l.tokensSold, amount, l.basePrice, l.slope);
        if (gross > l.ethReserve) {
            gross = l.ethReserve;
        }
        uint256 fee = (gross * l.sellTaxBps) / BPS_DENOMINATOR;
        uint256 payout = gross - fee;

        l.tokensSold -= amount;
        l.ethReserve -= gross;
        if (l.graduated && l.tokensSold < l.totalSupply) {
            l.graduated = false;
        }

        _splitFee(l.creator, fee);
        emit Sold(id, msg.sender, amount, payout, fee);

        _sendValue(msg.sender, payout);
    }

    // ---------------------------------------------------------------------
    // Quotes / views
    // ---------------------------------------------------------------------

    /// @notice Quote a buy: how many tokens `ethIn` buys, the fee and the ETH used by the curve.
    function quoteBuy(uint256 id, uint256 ethIn)
        external
        view
        returns (uint256 tokensOut, uint256 fee, uint256 spend)
    {
        Launch storage l = launches[id];
        if (l.token == address(0)) revert LaunchNotFound();

        uint256 remaining = l.totalSupply - l.tokensSold;
        fee = (ethIn * l.buyTaxBps) / BPS_DENOMINATOR;
        uint256 curveEth = ethIn - fee;

        tokensOut = _tokensForEth(l.tokensSold, curveEth, l.basePrice, l.slope);
        if (tokensOut > remaining) {
            tokensOut = remaining;
            spend = _costToBuy(l.tokensSold, tokensOut, l.basePrice, l.slope);
            fee = (spend * l.buyTaxBps) / BPS_DENOMINATOR;
        } else {
            spend = curveEth;
        }
    }

    /// @notice Quote a sell: how much ETH `amount` tokens returns, and the fee.
    function quoteSell(uint256 id, uint256 amount)
        external
        view
        returns (uint256 ethOut, uint256 fee)
    {
        Launch storage l = launches[id];
        if (l.token == address(0)) revert LaunchNotFound();
        if (amount > l.tokensSold) revert InsufficientValue();

        uint256 gross = _proceedsForSell(l.tokensSold, amount, l.basePrice, l.slope);
        if (gross > l.ethReserve) {
            gross = l.ethReserve;
        }
        fee = (gross * l.sellTaxBps) / BPS_DENOMINATOR;
        ethOut = gross - fee;
    }

    /// @notice Current spot price in wei per whole token.
    function priceOf(uint256 id) external view returns (uint256) {
        Launch storage l = launches[id];
        if (l.token == address(0)) revert LaunchNotFound();
        return l.basePrice + (l.slope * l.tokensSold) / WAD;
    }

    /// @notice Paginated list of launches.
    function getLaunches(uint256 offset, uint256 limit)
        external
        view
        returns (Launch[] memory result)
    {
        uint256 total = launchCount;
        if (offset >= total) {
            return new Launch[](0);
        }
        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }
        result = new Launch[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = launches[i + 1];
        }
    }

    /// @notice All launches.
    function getAllLaunches() external view returns (Launch[] memory result) {
        result = new Launch[](launchCount);
        for (uint256 i = 0; i < launchCount; i++) {
            result[i] = launches[i + 1];
        }
    }

    // ---------------------------------------------------------------------
    // Fees
    // ---------------------------------------------------------------------

    /// @notice Withdraw fees accumulated for the caller as a token creator.
    function claimCreatorFees() external nonReentrant returns (uint256 amount) {
        amount = creatorFees[msg.sender];
        if (amount == 0) revert NoFees();
        creatorFees[msg.sender] = 0;
        emit CreatorFeesClaimed(msg.sender, amount);
        _sendValue(msg.sender, amount);
    }

    /// @notice Withdraw protocol fees to the fee recipient.
    function withdrawProtocolFees() external nonReentrant returns (uint256 amount) {
        amount = protocolFees;
        if (amount == 0) revert NoFees();
        protocolFees = 0;
        emit ProtocolFeesWithdrawn(feeRecipient, amount);
        _sendValue(feeRecipient, amount);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
    }

    function setCreationFee(uint256 newFee) external onlyOwner {
        creationFee = newFee;
    }

    /// @notice Transfer ownership of the launchpad.
    function transferOwnership(address newOwner) public override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        _transferOwnership(newOwner);
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Integral of the linear curve between `sold` and `sold + amount`, in wei.
    ///      cost = basePrice*d/WAD + slope*(2*sold*d + d^2) / (2*WAD^2)
    function _costToBuy(uint256 sold, uint256 amount, uint256 basePrice, uint256 slope)
        internal
        pure
        returns (uint256)
    {
        uint256 linear = (basePrice * amount) / WAD;
        uint256 quadratic = (slope * (2 * sold * amount + amount * amount)) / (2 * WAD * WAD);
        return linear + quadratic;
    }

    /// @dev Integral of the linear curve between `sold - amount` and `sold`, in wei.
    function _proceedsForSell(uint256 sold, uint256 amount, uint256 basePrice, uint256 slope)
        internal
        pure
        returns (uint256)
    {
        uint256 linear = (basePrice * amount) / WAD;
        uint256 quadratic = (slope * (2 * sold * amount - amount * amount)) / (2 * WAD * WAD);
        return linear + quadratic;
    }

    /// @dev Inverse of {_costToBuy}: tokens received for `ethIn`.
    ///      Solves slope*d^2 + (2*WAD*basePrice + 2*sold*slope)*d - 2*WAD^2*ethIn = 0.
    function _tokensForEth(uint256 sold, uint256 ethIn, uint256 basePrice, uint256 slope)
        internal
        pure
        returns (uint256)
    {
        uint256 b = 2 * WAD * basePrice + 2 * sold * slope;
        uint256 discriminant = b * b + 8 * slope * WAD * WAD * ethIn;
        uint256 root = _sqrt(discriminant);
        return (root - b) / (2 * slope);
    }

    /// @dev Babylonian square root.
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function _splitFee(address creator, uint256 fee) internal {
        if (fee == 0) return;
        uint256 creatorShare = fee / 2;
        creatorFees[creator] += creatorShare;
        protocolFees += fee - creatorShare;
    }

    function _sendValue(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
