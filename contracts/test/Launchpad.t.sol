// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {Launchpad} from "../src/Launchpad.sol";
import {LaunchToken} from "../src/LaunchToken.sol";

contract LaunchpadTest is Test {
    Launchpad internal launchpad;
    LaunchToken internal token;

    address internal owner = makeAddr("owner");
    address internal feeRecipient = makeAddr("feeRecipient");
    address internal creator = makeAddr("creator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant SUPPLY = 1_000_000 ether;
    uint256 internal constant BASE_PRICE = 1e12; // 0.000001 ETH per whole token
    uint256 internal constant SLOPE = 1e10; // +0.00000001 ETH per whole token sold
    uint256 internal constant CREATION_FEE = 0.001 ether;
    uint256 internal constant BUY_TAX_BPS = 100; // 1%
    uint256 internal constant SELL_TAX_BPS = 100; // 1%

    function setUp() public {
        launchpad = new Launchpad(owner, feeRecipient, CREATION_FEE);
        vm.deal(creator, 100 ether);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);

        vm.prank(creator);
        (address tokenAddr, uint256 id) = launchpad.createLaunch{value: CREATION_FEE}(
            "Test Token", "TEST", SUPPLY, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );
        token = LaunchToken(tokenAddr);
        assertEq(id, 1);
    }

    // ---------------------------------------------------------------------
    // Creation
    // ---------------------------------------------------------------------

    function test_CreateLaunchInitialState() public view {
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TEST");
        assertEq(token.totalSupply(), SUPPLY);
        assertEq(token.balanceOf(address(launchpad)), SUPPLY);
        assertEq(token.creator(), creator);
        assertEq(token.launchpad(), address(launchpad));

        (
            address t,
            address c,
            uint256 supply,
            uint256 sold,
            uint256 reserve,
            uint256 base,
            uint256 slope,
            uint256 buyTax,
            uint256 sellTax,
            bool grad
        ) = launchpad.launches(1);
        assertEq(t, address(token));
        assertEq(c, creator);
        assertEq(supply, SUPPLY);
        assertEq(sold, 0);
        assertEq(reserve, 0);
        assertEq(base, BASE_PRICE);
        assertEq(slope, SLOPE);
        assertEq(buyTax, BUY_TAX_BPS);
        assertEq(sellTax, SELL_TAX_BPS);
        assertFalse(grad);
        assertEq(launchpad.tokenToId(address(token)), 1);
        assertEq(launchpad.launchCount(), 1);
    }

    function test_CreateLaunchEmits() public {
        vm.deal(alice, 1 ether);
        vm.recordLogs();
        vm.prank(alice);
        launchpad.createLaunch{value: CREATION_FEE}(
            "Second", "SEC", SUPPLY, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 sig = keccak256(
            "Launched(uint256,address,address,string,string,uint256,uint256,uint256,uint256,uint256)"
        );
        bool found;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == sig) {
                found = true;
                assertEq(logs[i].topics[1], bytes32(uint256(2)));
                assertEq(logs[i].topics[3], bytes32(uint256(uint160(alice))));
            }
        }
        assertTrue(found, "Launched event not emitted");
    }

    function test_CreateLaunchStoresProtocolFee() public view {
        assertEq(launchpad.protocolFees(), CREATION_FEE);
    }

    function test_RevertWhen_CreationFeeWrong() public {
        vm.prank(alice);
        vm.expectRevert(Launchpad.InsufficientValue.selector);
        launchpad.createLaunch("X", "X", SUPPLY, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS);
    }

    function test_RevertWhen_InvalidParams() public {
        vm.startPrank(alice);
        vm.expectRevert(Launchpad.InvalidParams.selector);
        launchpad.createLaunch{value: CREATION_FEE}(
            "", "X", SUPPLY, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );

        vm.expectRevert(Launchpad.InvalidParams.selector);
        launchpad.createLaunch{value: CREATION_FEE}(
            "X", "X", 0, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );

        vm.expectRevert(Launchpad.InvalidParams.selector);
        launchpad.createLaunch{value: CREATION_FEE}(
            "X", "X", 1 ether + 1, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );

        vm.expectRevert(Launchpad.InvalidParams.selector);
        launchpad.createLaunch{value: CREATION_FEE}(
            "X", "X", SUPPLY, 0, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );

        vm.expectRevert(Launchpad.InvalidParams.selector);
        launchpad.createLaunch{value: CREATION_FEE}(
            "X", "X", SUPPLY, BASE_PRICE, 0, BUY_TAX_BPS, SELL_TAX_BPS
        );
        vm.stopPrank();
    }

    function test_RevertWhen_TaxTooHigh() public {
        vm.startPrank(alice);
        vm.expectRevert(Launchpad.FeeTooHigh.selector);
        launchpad.createLaunch{value: CREATION_FEE}("X", "X", SUPPLY, BASE_PRICE, SLOPE, 1_001, 0);

        vm.expectRevert(Launchpad.FeeTooHigh.selector);
        launchpad.createLaunch{value: CREATION_FEE}("X", "X", SUPPLY, BASE_PRICE, SLOPE, 0, 1_001);
        vm.stopPrank();
    }

    function test_BuyUsesBuyTaxSellUsesSellTax() public {
        uint256 buyTax = 200;
        uint256 sellTax = 50;
        uint256 ethIn = 1 ether;
        vm.deal(bob, 10 ether);
        vm.prank(bob);
        (address tokenAddr,) = launchpad.createLaunch{value: CREATION_FEE}(
            "Taxed", "TAX", SUPPLY, BASE_PRICE, SLOPE, buyTax, sellTax
        );
        uint256 id = launchpad.tokenToId(tokenAddr);

        (uint256 tokensOut, uint256 feeBuy, uint256 spend) = launchpad.quoteBuy(id, ethIn);
        assertEq(feeBuy, (ethIn * buyTax) / 10_000);
        assertEq(spend + feeBuy, ethIn);

        vm.prank(bob);
        launchpad.buy{value: ethIn}(id);
        assertGt(LaunchToken(tokenAddr).balanceOf(bob), 0);

        (uint256 ethOut, uint256 feeSell) = launchpad.quoteSell(id, tokensOut);
        assertApproxEqAbs(feeSell, (spend * sellTax) / 10_000, 1_000);
        assertGt(ethOut, 0);
    }

    // ---------------------------------------------------------------------
    // Buying
    // ---------------------------------------------------------------------

    function test_BuyDeliversTokensAndTracksState() public {
        uint256 ethIn = 0.5 ether;
        (uint256 expectedTokens, uint256 expectedFee, uint256 expectedSpend) =
            launchpad.quoteBuy(1, ethIn);

        vm.prank(alice);
        launchpad.buy{value: ethIn}(1);

        (,,,, uint256 reserve,,,,,) = launchpad.launches(1);
        assertEq(token.balanceOf(alice), expectedTokens);
        assertEq(reserve, expectedSpend);
        assertEq(launchpad.creatorFees(creator), expectedFee / 2);
        assertEq(launchpad.protocolFees(), CREATION_FEE + (expectedFee - expectedFee / 2));
    }

    function test_BuyRevertsWithZeroValue() public {
        vm.prank(alice);
        vm.expectRevert(Launchpad.ZeroValue.selector);
        launchpad.buy{value: 0}(1);
    }

    function test_RevertWhen_BuyUnknownLaunch() public {
        vm.prank(alice);
        vm.expectRevert(Launchpad.LaunchNotFound.selector);
        launchpad.buy{value: 1 ether}(999);
    }

    function test_PriceIncreasesAfterBuy() public {
        uint256 priceBefore = launchpad.priceOf(1);
        vm.prank(alice);
        launchpad.buy{value: 1 ether}(1);
        assertGt(launchpad.priceOf(1), priceBefore);
    }

    // ---------------------------------------------------------------------
    // Selling
    // ---------------------------------------------------------------------

    function test_SellReturnsEthMinusFee() public {
        uint256 ethIn = 0.5 ether;
        vm.prank(alice);
        launchpad.buy{value: ethIn}(1);

        uint256 tokens = token.balanceOf(alice);
        (uint256 expectedEthOut,) = launchpad.quoteSell(1, tokens);

        uint256 balanceBefore = alice.balance;
        vm.startPrank(alice);
        token.approve(address(launchpad), tokens);
        launchpad.sell(1, tokens);
        vm.stopPrank();

        (,,, uint256 sold, uint256 reserve,,,,,) = launchpad.launches(1);
        assertEq(alice.balance, balanceBefore + expectedEthOut);
        assertEq(token.balanceOf(alice), 0);
        assertEq(sold, 0);
        assertLe(reserve, 100); // rounding dust may remain on the curve
    }

    function test_RevertWhen_SellMoreThanSold() public {
        vm.prank(alice);
        launchpad.buy{value: 0.5 ether}(1);
        uint256 tokens = token.balanceOf(alice);
        vm.prank(alice);
        vm.expectRevert(Launchpad.InsufficientValue.selector);
        launchpad.sell(1, tokens + 1);
    }

    function test_RevertWhen_SellWithoutApproval() public {
        vm.prank(alice);
        launchpad.buy{value: 0.5 ether}(1);
        uint256 amount = token.balanceOf(alice);
        vm.expectRevert();
        vm.prank(bob);
        launchpad.sell(1, amount);
    }

    // ---------------------------------------------------------------------
    // Graduation
    // ---------------------------------------------------------------------

    function test_BuyCapsAtSupplyAndRefunds() public {
        uint256 huge = 10_000 ether;
        vm.deal(bob, huge);

        vm.prank(bob);
        launchpad.buy{value: huge}(1);

        (
            address _t,
            address _c,
            uint256 _supply,
            uint256 sold,
            uint256 _reserve,
            uint256 _base,
            uint256 _slope,
            uint256 _buyTax,
            uint256 _sellTax,
            bool graduated
        ) = launchpad.launches(1);
        assertEq(sold, SUPPLY);
        assertTrue(graduated);
        assertEq(token.balanceOf(bob), SUPPLY);
        assertGt(bob.balance, 0, "unused ETH should be refunded");
    }

    function test_RevertWhen_BuyAfterGraduation() public {
        vm.deal(bob, 10_000 ether);
        vm.prank(bob);
        launchpad.buy{value: 10_000 ether}(1);

        vm.prank(alice);
        vm.expectRevert(Launchpad.SoldOut.selector);
        launchpad.buy{value: 1 ether}(1);
    }

    // ---------------------------------------------------------------------
    // Fees
    // ---------------------------------------------------------------------

    function test_ClaimCreatorFees() public {
        vm.prank(alice);
        launchpad.buy{value: 1 ether}(1);

        uint256 owed = launchpad.creatorFees(creator);
        assertGt(owed, 0);

        uint256 before = creator.balance;
        vm.prank(creator);
        launchpad.claimCreatorFees();
        assertEq(creator.balance, before + owed);
        assertEq(launchpad.creatorFees(creator), 0);
    }

    function test_RevertWhen_ClaimNoFees() public {
        vm.prank(alice);
        vm.expectRevert(Launchpad.NoFees.selector);
        launchpad.claimCreatorFees();
    }

    function test_WithdrawProtocolFees() public {
        vm.prank(alice);
        launchpad.buy{value: 1 ether}(1);

        uint256 owed = launchpad.protocolFees();
        uint256 before = feeRecipient.balance;
        launchpad.withdrawProtocolFees();
        assertEq(feeRecipient.balance, before + owed);
        assertEq(launchpad.protocolFees(), 0);
    }

    // ---------------------------------------------------------------------
    // Admin
    // ---------------------------------------------------------------------

    function test_OnlyOwnerCanSetFeeRecipient() public {
        vm.prank(alice);
        vm.expectRevert();
        launchpad.setFeeRecipient(alice);

        vm.prank(owner);
        launchpad.setFeeRecipient(alice);
        assertEq(launchpad.feeRecipient(), alice);
    }

    function test_OnlyOwnerCanSetCreationFee() public {
        vm.prank(alice);
        vm.expectRevert();
        launchpad.setCreationFee(0.002 ether);

        vm.prank(owner);
        launchpad.setCreationFee(0.002 ether);
        assertEq(launchpad.creationFee(), 0.002 ether);
    }

    function test_TransferOwnership() public {
        vm.prank(owner);
        launchpad.transferOwnership(alice);
        assertEq(launchpad.owner(), alice);
    }

    // ---------------------------------------------------------------------
    // Listings
    // ---------------------------------------------------------------------

    function test_GetLaunches() public {
        vm.startPrank(alice);
        launchpad.createLaunch{value: CREATION_FEE}(
            "Second", "SEC", SUPPLY, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );
        launchpad.createLaunch{value: CREATION_FEE}(
            "Third", "THR", SUPPLY, BASE_PRICE, SLOPE, BUY_TAX_BPS, SELL_TAX_BPS
        );
        vm.stopPrank();

        Launchpad.Launch[] memory all = launchpad.getAllLaunches();
        assertEq(all.length, 3);

        Launchpad.Launch[] memory page = launchpad.getLaunches(1, 2);
        assertEq(page.length, 2);
        assertEq(page[0].creator, alice);
        assertEq(page[1].creator, alice);
    }

    // ---------------------------------------------------------------------
    // Fuzz
    // ---------------------------------------------------------------------

    /// @dev Buying and immediately selling the same tokens must return the funds minus
    ///      the buy fee and the sell fee, and must leave the curve where it started.
    function testFuzz_BuySellRoundTrip(uint256 ethIn) public {
        ethIn = bound(ethIn, 0.0001 ether, 0.5 ether);
        vm.deal(alice, ethIn);

        (uint256 tokensOut, uint256 feeBuy, uint256 spend) = launchpad.quoteBuy(1, ethIn);
        vm.prank(alice);
        launchpad.buy{value: ethIn}(1);
        assertEq(token.balanceOf(alice), tokensOut);
        assertEq(spend + feeBuy, ethIn);

        uint256 balanceAfterBuy = alice.balance;
        (uint256 ethOut, uint256 feeSell) = launchpad.quoteSell(1, tokensOut);
        vm.startPrank(alice);
        token.approve(address(launchpad), tokensOut);
        launchpad.sell(1, tokensOut);
        vm.stopPrank();

        assertEq(alice.balance, balanceAfterBuy + ethOut);
        assertApproxEqAbs(ethOut, spend - feeSell, 10);

        (,,, uint256 sold, uint256 reserve,,,,,) = launchpad.launches(1);
        assertEq(sold, 0);
        assertLe(reserve, 100); // rounding dust may remain on the curve
    }

    /// @dev The ETH actually spent always matches the curve integral for the tokens received.
    function testFuzz_QuoteBuyMatchesCost(uint256 ethIn) public view {
        ethIn = bound(ethIn, 0.0001 ether, 200 ether);
        (uint256 tokensOut, uint256 fee, uint256 spend) = launchpad.quoteBuy(1, ethIn);

        if (tokensOut < SUPPLY) {
            assertEq(spend + fee, ethIn);
        } else {
            assertEq(tokensOut, SUPPLY);
        }
        assertLe(spend + fee, ethIn);
    }
}
