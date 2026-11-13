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
  console.log(" A11 - Reentrance : coffre vulnerable");
  console.log("==================================================");

  const VulnerableVault = await ethers.getContractFactory("VulnerableVault");
  const vulnerable = await VulnerableVault.deploy();
  await vulnerable.waitForDeployment();
  const vulnerableAdresse = await vulnerable.getAddress();
  console.log("Coffre vulnerable deploye :", vulnerableAdresse);

  await vulnerable.connect(alice).deposer({ value: ethers.parseEther("10") });
  console.log("Alice depose 10 ETH");

  const Attacker = await ethers.getContractFactory("Attacker");
  const attaquant = await Attacker.connect(modou).deploy(vulnerableAdresse);
  await attaquant.waitForDeployment();
  const attaquantAdresse = await attaquant.getAddress();
  console.log("Contrat attaquant deploye :", attaquantAdresse);

  await attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") });
  console.log("Modou depose 1 ETH via le contrat attaquant puis appelle retirer()");

  console.log("");
  console.log("Reentrances executees      :", (await attaquant.reentrances()).toString());
  console.log("Solde du coffre            :", eth(await ethers.provider.getBalance(vulnerableAdresse)));
  console.log("Solde du contrat attaquant :", eth(await ethers.provider.getBalance(attaquantAdresse)));
  console.log("Solde enregistre d'Alice   :", eth(await vulnerable.balances(alice.address)));

  try {
    await vulnerable.connect(alice).retirer();
    console.log("Alice a retire ses 10 ETH");
  } catch (erreur) {
    console.log("Alice tente de retirer     : REVERT ->", raison(erreur));
  }

  await attaquant.connect(modou).retirerFonds();
  console.log("Transfert des 11 ETH vers Modou");
  console.log("Solde restant du contrat   :", eth(await ethers.provider.getBalance(attaquantAdresse)));

  console.log("");
  console.log("==================================================");
  console.log(" A11 - Reentrance : coffre corrige");
  console.log("==================================================");

  const FixedVault = await ethers.getContractFactory("FixedVault");
  const fixed = await FixedVault.deploy();
  await fixed.waitForDeployment();
  const fixedAdresse = await fixed.getAddress();
  console.log("Coffre corrige deploye :", fixedAdresse);

  await fixed.connect(alice).deposer({ value: ethers.parseEther("10") });
  console.log("Alice depose 10 ETH");

  const attaquant2 = await Attacker.connect(modou).deploy(fixedAdresse);
  await attaquant2.waitForDeployment();
  const attaquant2Adresse = await attaquant2.getAddress();
  console.log("Contrat attaquant deploye :", attaquant2Adresse);

  try {
    await attaquant2.connect(modou).attaquer({ value: ethers.parseEther("1") });
    console.log("L'attaque a reussi (ceci ne doit pas arriver)");
  } catch (erreur) {
    console.log("Attaque bloquee           : REVERT ->", raison(erreur));
  }

  console.log("");
  console.log("Reentrances executees      :", (await attaquant2.reentrances()).toString());
  console.log("Solde du coffre            :", eth(await ethers.provider.getBalance(fixedAdresse)));
  console.log("Solde enregistre d'Alice   :", eth(await fixed.balances(alice.address)));

  await fixed.connect(alice).retirer();
  console.log("Alice retire ses fonds     :", eth(await fixed.balances(alice.address)));
  console.log("Solde final du coffre      :", eth(await ethers.provider.getBalance(fixedAdresse)));
}

main().catch((erreur) => {
  console.error(erreur);
  process.exitCode = 1;
});
