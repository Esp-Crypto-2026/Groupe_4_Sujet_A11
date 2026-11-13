const { ethers } = require("hardhat");

function eth(valeur) {
  return `${ethers.formatEther(valeur)} ETH`;
}

function raison(erreur) {
  return erreur.shortMessage || erreur.reason || erreur.message;
}

async function main() {
  const [alice, modou] = await ethers.getSigners();

  const FixedVault = await ethers.getContractFactory("FixedVault");
  const fixed = await FixedVault.deploy();
  await fixed.waitForDeployment();
  const fixedAdresse = await fixed.getAddress();
  console.log("Coffre corrige deploye :", fixedAdresse);

  await fixed.connect(alice).deposer({ value: ethers.parseEther("10") });
  console.log("Alice depose 10 ETH");

  const Attacker = await ethers.getContractFactory("Attacker");
  const attaquant = await Attacker.connect(modou).deploy(fixedAdresse);
  await attaquant.waitForDeployment();
  console.log("Contrat attaquant deploye :", await attaquant.getAddress());

  try {
    await attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") });
    console.log("L'attaque a reussi (ceci ne doit pas arriver)");
  } catch (erreur) {
    console.log("Attaque bloquee           : REVERT ->", raison(erreur));
  }

  console.log("");
  console.log("Reentrances executees      :", (await attaquant.reentrances()).toString());
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
