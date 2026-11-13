// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IVault.sol";

contract VulnerableVault is IVault {
    mapping(address => uint256) public balances;

    event Depot(address indexed compte, uint256 montant);
    event Retrait(address indexed compte, uint256 montant);

    function deposer() external payable {
        require(msg.value > 0, "montant nul");
        balances[msg.sender] += msg.value;
        emit Depot(msg.sender, msg.value);
    }

    function retirer() external {
        uint256 montant = balances[msg.sender];
        require(montant > 0, "rien a retirer");

        (bool ok, ) = msg.sender.call{value: montant}("");
        require(ok, "envoi echoue");

        balances[msg.sender] = 0;
        emit Retrait(msg.sender, montant);
    }

    function soldeContrat() external view returns (uint256) {
        return address(this).balance;
    }
}
