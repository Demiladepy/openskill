// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SkillReputation
/// @notice Emits attestation events on Base Sepolia; optionally restricts callers to a trusted set.
contract SkillReputation {
    address public owner;
    bool public requireTrusted;
    mapping(address => bool) public trusted;

    event Attested(
        address indexed attestor,
        bytes32 indexed skillKey,
        uint8 score,
        bytes32 digest,
        uint256 timestamp
    );

    error Unauthorized();
    error InvalidScore();

    constructor(bool _requireTrusted) {
        owner = msg.sender;
        requireTrusted = _requireTrusted;
        trusted[msg.sender] = true;
    }

    function setTrusted(address account, bool ok) external {
        if (msg.sender != owner) revert Unauthorized();
        trusted[account] = ok;
    }

    function setRequireTrusted(bool value) external {
        if (msg.sender != owner) revert Unauthorized();
        requireTrusted = value;
    }

    /// @param skillKey Off-chain identity digest (see repo README).
    /// @param score 0–100 inclusive.
    /// @param digest Commitment to off-chain log snapshot.
    function attest(bytes32 skillKey, uint8 score, bytes32 digest) external {
        if (score > 100) revert InvalidScore();
        if (requireTrusted && !trusted[msg.sender]) revert Unauthorized();
        emit Attested(msg.sender, skillKey, score, digest, block.timestamp);
    }
}
