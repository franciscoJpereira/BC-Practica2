// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

import {Test, console} from "forge-std/Test.sol";
import {DelayPayment, PaymentErrors} from "../src/DelayedPayment.sol";

contract DelayedPaymentTest is Test {
    DelayPayment public paymentContract;

    address public client = address(0x1111);
    address public provider = address(0x2222);
    address public thirdParty = address(0x3333);

    string constant AGREEMENT_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    string constant DELIVERABLE_CID = "bafybeif255okcs4772x4nffomz6iypa5ptps7zfcg6r4xovuhuxgq2m2ey";

    function setUp() public {
        paymentContract = new DelayPayment();
        vm.deal(client, 10 ether);
        vm.deal(provider, 10 ether);
        vm.deal(thirdParty, 10 ether);
    }

    // 1. Verify fix 1: Named struct initialization & correct field assignment
    function test_CreatePaymentFields() public {
        uint256 dueTime = block.timestamp + 1 days;
        uint256 amount = 1 ether;

        vm.prank(client);
        uint256 paymentId = paymentContract.createPayment(dueTime, amount, provider, AGREEMENT_CID);

        (
            address ben,
            uint256 amt,
            uint256 payed,
            uint48 due,
            string memory agrCID,
            string memory delCID,
            bool approved,
            bool disputed
        ) = paymentContract.payments(paymentId);

        assertEq(ben, provider, "Beneficiary mismatch");
        assertEq(amt, amount, "Amount mismatch");
        assertEq(payed, 0, "Payed must be 0 on creation");
        assertEq(due, uint48(dueTime), "Due time mismatch");
        assertEq(agrCID, AGREEMENT_CID, "Agreement CID mismatch");
        assertEq(delCID, "", "Deliverable CID must be empty initially");
        assertFalse(approved, "Should not be approved initially");
        assertFalse(disputed, "Should not be disputed initially");
    }

    // 2. Verify fix 2: splitAndApproveMilestone works cleanly with debtor
    function test_SplitAndApproveMilestoneFlow() public {
        uint256 dueTime = block.timestamp + 10 days;
        uint256 amount = 1 ether;

        vm.prank(client);
        uint256 parentId = paymentContract.createPayment(dueTime, amount, provider, AGREEMENT_CID);

        // Provider attaches deliverable
        vm.prank(provider);
        paymentContract.submitDeliverable(parentId, DELIVERABLE_CID);

        // Debtor splits and approves 0.4 ether milestone
        vm.prank(client);
        paymentContract.splitAndApproveMilestone{value: 0.4 ether}(parentId);

        // Parent remaining amount should be 0.6 ether
        (, uint256 remainingAmt,,,,, bool parentApproved,) = paymentContract.payments(parentId);
        assertEq(remainingAmt, 0.6 ether, "Parent amount should be reduced by 0.4 ether");
        assertFalse(parentApproved, "Parent should not be approved");

        // Provider claims milestone without waiting for dueTime because approved = true
        // The newly split milestone has ID generated via counter = 1
        uint256 milestoneId = uint256(keccak256(abi.encodePacked(client, uint256(1))));
        (,,,,,, bool milestoneApproved,) = paymentContract.payments(milestoneId);
        assertTrue(milestoneApproved, "Milestone token must be approved");

        uint256 providerBalBefore = provider.balance;
        vm.prank(provider);
        paymentContract.claim(milestoneId);
        assertEq(provider.balance - providerBalBefore, 0.4 ether, "Provider should receive milestone funds");
    }

    // 3. Verify fix 3: Claiming without paying is blocked
    function test_CannotClaimUnpaidPayment() public {
        vm.prank(client);
        uint256 unpaidPayment = paymentContract.createPayment(block.timestamp + 1 hours, 2 ether, provider, AGREEMENT_CID);

        vm.prank(provider);
        paymentContract.submitDeliverable(unpaidPayment, DELIVERABLE_CID);

        vm.warp(block.timestamp + 2 hours);

        // Beneficiary attempts to claim without payment being funded -> MUST REVERT Unpayed
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(PaymentErrors.Unpayed.selector, unpaidPayment));
        paymentContract.claim(unpaidPayment);
    }

    // 4. Verify fix 4: Dispute flow and DisputedPayment event
    function test_DisputeAndUndispute() public {
        vm.prank(client);
        uint256 paymentId = paymentContract.createPayment(block.timestamp + 1 hours, 1 ether, provider, AGREEMENT_CID);

        // Client pays
        vm.prank(client);
        paymentContract.pay{value: 1 ether}(paymentId);

        // Provider submits deliverable
        vm.prank(provider);
        paymentContract.submitDeliverable(paymentId, DELIVERABLE_CID);

        // Client disputes payment
        vm.prank(client);
        paymentContract.disputePayment(paymentId);

        (,,,,,,, bool disputed) = paymentContract.payments(paymentId);
        assertTrue(disputed, "Payment should be marked disputed");

        // Beneficiary cannot claim while disputed
        vm.warp(block.timestamp + 2 hours);
        vm.prank(provider);
        vm.expectRevert(abi.encodeWithSelector(PaymentErrors.DisputedPayment.selector, paymentId));
        paymentContract.claim(paymentId);

        // Client undisputes
        vm.prank(client);
        paymentContract.undisputePayment(paymentId);

        // Beneficiary can now claim
        vm.prank(provider);
        paymentContract.claim(paymentId);
    }

    // 5. Verify slashing payer when deadline passes unpaid and delivered
    function test_SlashPayerWhenDeliveredAndUnpaid() public {
        vm.prank(client);
        uint256 paymentId = paymentContract.createPayment(block.timestamp + 1 hours, 1 ether, provider, AGREEMENT_CID);

        vm.prank(provider);
        paymentContract.submitDeliverable(paymentId, DELIVERABLE_CID);

        vm.warp(block.timestamp + 2 hours);

        // Slash client
        paymentContract.slashPayer(paymentId);
        assertEq(paymentContract.slashed(client), 1, "Client should be slashed");

        // Slashed client cannot create new payments
        vm.prank(client);
        vm.expectRevert(abi.encodeWithSelector(PaymentErrors.SlashedDebtor.selector, client));
        paymentContract.createPayment(block.timestamp + 1 days, 1 ether, provider, AGREEMENT_CID);
    }
}
