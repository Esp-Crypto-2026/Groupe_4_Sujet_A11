// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IVault.sol";

contract FixedVault is IVault {
    mapping(address => uint256) public balances;

    bool private verrou;

    event Depot(address indexed compte, uint256 montant);
    event Retrait(address indexed compte, uint256 montant);

    modifier nonReentrant() {
        require(!verrou, "reentrance bloquee");
        verrou = true;
        _;
        verrou = false;
    }

    function deposer() external payable {
        require(msg.value > 0, "montant nul");
        balances[msg.sender] += msg.value;
        emit Depot(msg.sender, msg.value);
    }

    function retirer() external nonReentrant {
        uint256 montant = balances[msg.sender];
        require(montant > 0, "rien a retirer");

        balances[msg.sender] = 0;

        (bool ok, bytes memory donnees) = msg.sender.call{value: montant}("");
        if (!ok) {
            if (donnees.length > 0) {
                assembly {
                    revert(add(donnees, 0x20), mload(donnees))
                }
            }
            revert("envoi echoue");
        }

        emit Retrait(msg.sender, montant);
    }

    function soldeContrat() external view returns (uint256) {
        return address(this).balance;
    }
}
