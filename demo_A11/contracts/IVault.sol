// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVault {
    function deposer() external payable;
    function retirer() external;
    function balances(address compte) external view returns (uint256);
    function soldeContrat() external view returns (uint256);
}
