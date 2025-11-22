// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

contract U is OFT {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) {}

    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
