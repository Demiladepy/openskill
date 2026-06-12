// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title StrategyEscrow (reference)
 * @notice Track 2 uses the official ERC-8183 AgenticCommerce kernel for escrow.
 *       This contract documents the integration surface for strategy job payments.
 *       Deploy is optional — production jobs use SDK addresses on BSC Testnet.
 */
interface IAgenticCommerce {
    function paymentToken() external view returns (address);
}

contract StrategyEscrow {
    address public immutable commerceKernel;
    string public constant VERSION = "1.0.0";

    event StrategyJobReferenced(bytes32 indexed jobRef, address indexed commerceKernel);

    constructor(address commerceKernel_) {
        require(commerceKernel_ != address(0), "commerce required");
        commerceKernel = commerceKernel_;
        emit StrategyJobReferenced(keccak256("cmc-strategy-vault"), commerceKernel_);
    }

    function paymentToken() external view returns (address) {
        return IAgenticCommerce(commerceKernel).paymentToken();
    }
}
