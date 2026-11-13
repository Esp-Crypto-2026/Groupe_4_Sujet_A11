const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("A11 - Reentrance sur un coffre Solidity", function () {
  let alice;
  let modou;

  beforeEach(async function () {
    [alice, modou] = await ethers.getSigners();
  });

  async function deployerVulnerable() {
    const Fabrique = await ethers.getContractFactory("VulnerableVault");
    const coffre = await Fabrique.deploy();
    await coffre.waitForDeployment();
    return coffre;
  }

  async function deployerCorrige() {
    const Fabrique = await ethers.getContractFactory("FixedVault");
    const coffre = await Fabrique.deploy();
    await coffre.waitForDeployment();
    return coffre;
  }

  async function deployerAttaquant(coffre) {
    const Fabrique = await ethers.getContractFactory("Attacker");
    const attaquant = await Fabrique.connect(modou).deploy(await coffre.getAddress());
    await attaquant.waitForDeployment();
    return attaquant;
  }

  it("1. enregistre correctement le depot d'Alice", async function () {
    const coffre = await deployerVulnerable();
    await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });

    expect(await coffre.balances(alice.address)).to.equal(ethers.parseEther("10"));
    expect(await ethers.provider.getBalance(await coffre.getAddress())).to.equal(
      ethers.parseEther("10")
    );
  });

  it("2. vide le coffre vulnerable par reentrance", async function () {
    const coffre = await deployerVulnerable();
    await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });

    const attaquant = await deployerAttaquant(coffre);
    await attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") });

    expect(await ethers.provider.getBalance(await coffre.getAddress())).to.equal(0);
    expect(await attaquant.reentrances()).to.equal(10);
    expect(await ethers.provider.getBalance(await attaquant.getAddress())).to.equal(
      ethers.parseEther("11")
    );
  });

  it("3. empeche Alice de retirer apres l'attaque", async function () {
    const coffre = await deployerVulnerable();
    await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });

    const attaquant = await deployerAttaquant(coffre);
    await attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") });

    await expect(coffre.connect(alice).retirer()).to.be.revertedWith("envoi echoue");
  });

  it("4. permet a Modou de recuperer les 11 ETH du contrat attaquant", async function () {
    const coffre = await deployerVulnerable();
    await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });

    const attaquant = await deployerAttaquant(coffre);
    await attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") });

    await attaquant.connect(modou).retirerFonds();

    expect(await ethers.provider.getBalance(await attaquant.getAddress())).to.equal(0);
  });

  it("5. bloque l'attaque sur le coffre corrige", async function () {
    const coffre = await deployerCorrige();
    await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });

    const attaquant = await deployerAttaquant(coffre);

    await expect(
      attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") })
    ).to.be.revertedWith("reentrance bloquee");
  });

  it("6. conserve les 10 ETH d'Alice sur le coffre corrige", async function () {
    const coffre = await deployerCorrige();
    await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });

    const attaquant = await deployerAttaquant(coffre);

    await expect(
      attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") })
    ).to.be.reverted;

    expect(await ethers.provider.getBalance(await coffre.getAddress())).to.equal(
      ethers.parseEther("10")
    );
    expect(await coffre.balances(alice.address)).to.equal(ethers.parseEther("10"));
  });

  it("7. laisse Alice retirer ses 10 ETH sur le coffre corrige", async function () {
    const coffre = await deployerCorrige();
    await coffre.connect(alice).deposer({ value: ethers.parseEther("10") });

    const attaquant = await deployerAttaquant(coffre);
    await expect(
      attaquant.connect(modou).attaquer({ value: ethers.parseEther("1") })
    ).to.be.reverted;

    await coffre.connect(alice).retirer();

    expect(await coffre.balances(alice.address)).to.equal(0);
    expect(await ethers.provider.getBalance(await coffre.getAddress())).to.equal(0);
  });
});
