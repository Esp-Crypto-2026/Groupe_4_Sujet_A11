# A11 — Démonstration réentrance (Groupe 4)

Démonstration prête à exécuter pour l'exposé **A11 — Outils d'analyse de contrats Solidity**.

- Contrat vulnérable : `contracts/VulnerableVault.sol`
- Contrat corrigé : `contracts/FixedVault.sol`
- Contrat attaquant : `contracts/Attacker.sol`
- Script de démonstration : `scripts/demo.js`
- 7 tests automatiques : `test/vault.test.js`

## 1. Installation (une seule fois)

Il faut **Node.js 20 ou plus** (Node 20 LTS ou Node 22 recommandé).

```bash
cd demo_A11
npm install
```

## 2. Lancer la démonstration complète

Pour présenter en deux temps devant la classe :

```bash
npm run demo:vulnerable
npm test
npm run demo:fixed
```

Ou tout en une seule commande :

```bash
npm run demo
```

Le déroulé oral minuté est dans [`SCENARIO_DEMO.md`](SCENARIO_DEMO.md).

Cette commande fait tout :

1. déploie le coffre vulnérable ;
2. Alice dépose 10 ETH ;
3. le contrat attaquant de Modou dépose 1 ETH puis appelle `retirer()` ;
4. la fonction `receive()` de l'attaquant rappelle `retirer()` 10 fois ;
5. le coffre passe de 11 ETH à 0 ETH ;
6. Alice ne peut plus retirer ses 10 ETH ;
7. on recommence sur le coffre corrigé : l'attaque est bloquée ;
8. Alice récupère ses 10 ETH.

Résultat attendu (les valeurs doivent être identiques) :

```text
==================================================
 A11 - Reentrance : coffre vulnerable
==================================================
Coffre vulnerable deploye : 0x...
Alice depose 10 ETH
Contrat attaquant deploye : 0x...
Modou depose 1 ETH via le contrat attaquant puis appelle retirer()

Reentrances executees      : 10
Solde du coffre            : 0.0 ETH
Solde du contrat attaquant : 11.0 ETH
Solde enregistre d'Alice   : 10.0 ETH
Alice tente de retirer     : REVERT -> ... 'envoi echoue'
Transfert des 11 ETH vers Modou
Solde restant du contrat   : 0.0 ETH

==================================================
 A11 - Reentrance : coffre corrige
==================================================
Coffre corrige deploye : 0x...
Alice depose 10 ETH
Contrat attaquant deploye : 0x...
Attaque bloquee           : REVERT -> ... 'reentrance bloquee'

Reentrances executees      : 0
Solde du coffre            : 10.0 ETH
Solde enregistre d'Alice   : 10.0 ETH
Alice retire ses fonds     : 0.0 ETH
Solde final du coffre      : 0.0 ETH
```

## 3. Lancer les 7 tests

```bash
npm test
```

Résultat attendu : `7 passing`.

Les tests vérifient :

1. le dépôt d'Alice est enregistré ;
2. l'attaque vide le coffre vulnérable (11 ETH → 0, 10 réentrances) ;
3. Alice ne peut plus retirer après l'attaque ;
4. Modou récupère les 11 ETH via le contrat attaquant ;
5. le coffre corrigé bloque l'attaque ;
6. le coffre corrigé conserve les 10 ETH d'Alice ;
7. Alice récupère ses 10 ETH sur le coffre corrigé.

## 4. Explication à donner à l'oral

### Pourquoi l'attaque marche

Dans `VulnerableVault.retirer()`, l'ordre est :

```solidity
uint256 montant = balances[msg.sender];
(bool ok, ) = msg.sender.call{value: montant}("");   // 1. on envoie
require(ok, "envoi echoue");
balances[msg.sender] = 0;                           // 2. on met à jour trop tard
```

Quand le coffre envoie 1 ETH au contrat attaquant, la fonction `receive()` de
l'attaquant est exécutée. Elle rappelle `retirer()` **avant** que le solde de
l'attaquant ait été remis à zéro. Le coffre croit donc encore que l'attaquant a
1 ETH et renvoie 1 ETH. L'opération se répète jusqu'à vider le coffre.

Point clé : `Solidity 0.8` empêche les dépassements arithmétiques silencieux,
mais **ne corrige pas la réentrance**. Le problème vient de l'ordre des
instructions, pas de la version du compilateur.

### Pourquoi le contrat corrigé résiste

`FixedVault` applique deux protections :

1. **Vérifier – Modifier – Interagir (CEI)** : le solde est remis à zéro
   **avant** l'appel externe ;
2. **`nonReentrant`** : un verrou empêche tout appel réentrant pendant le
   retrait.

Quand `receive()` essaie de rappeler `retirer()`, le verrou est déjà pris :
l'appel est rejeté avec `reentrance bloquee`. Le revert remonte, l'envoi
échoue, et toute la transaction d'attaque est annulée. Alice garde ses 10 ETH.

### Phrase de conclusion pour l'exposé

> La réentrance est une faille d'ordre des instructions. Une alerte Slither ne
> prouve pas qu'une faille est exploitable, mais ici l'alerte correspond à une
> attaque réelle, reproduite sur un réseau Hardhat local.

## 5. Démonstration Slither

Installer Slither une seule fois (dans WSL/Linux ou avec Python) :

```bash
python3 -m pip install --user slither-analyzer solc-select
solc-select install 0.8.24
solc-select use 0.8.24
```

Lancer le détecteur de réentrance sur les deux contrats :

```bash
slither contracts/VulnerableVault.sol --detect reentrancy-eth
slither contracts/FixedVault.sol --detect reentrancy-eth
```

Attendu :

- `VulnerableVault` : alerte `reentrancy-eth` (impact élevé) sur la séquence
  envoi puis mise à jour du solde ;
- `FixedVault` : aucune alerte de réentrance.

Pour voir toutes les alertes :

```bash
slither contracts/VulnerableVault.sol
slither contracts/FixedVault.sol
```

Remarque : Slither peut signaler d'autres détecteurs (par exemple sur l'envoi
d'ETH) qui ne concernent pas la réentrance. Ne garder que `reentrancy-eth`
pour la démonstration.

## 6. TP3 — Tutorat réentrance (3 indices gradués)

Le groupe 4 anime le TP3 « réentrance » pour toute la classe. Faire d'abord le
TP avec le corrigé la veille, sur **deux systèmes différents** (par exemple un
poste Windows et un poste Linux/WSL), puis préparer ces indices :

- **Indice 1** : « Regardez l'ordre des deux lignes de `retirer()` : quand le
  solde est-il remis à zéro par rapport à l'envoi des ETH ? »
- **Indice 2** : « Que fait la fonction `receive()` du contrat attaquant quand
  elle reçoit les ETH ? Quel appel déclenche-t-elle ? »
- **Indice 3** : « Si `balances[msg.sender] = 0` était exécuté avant le `call`,
  que lirait la deuxième entrée dans `retirer()` ? »

Commandes de dépannage à connaître :

```bash
node --version
npm install
npx hardhat test
npx hardhat test test/vault.test.js
```

Si `npx hardhat` échoue : supprimer `node_modules` et `package-lock.json`,
puis relancer `npm install`. Sous Windows, utiliser WSL si les commandes
`python3`/`slither` ne sont pas disponibles.

## 7. Rôles annexes du groupe 4

### Discutant de A1 — Modes AES

Deux questions critiques à envoyer avant 12 h le jour J :

1. **Méthode** : comment le corpus d'applications Android de paiement a-t-il
   été constitué, et garantit-il la représentativité de l'Afrique de l'Ouest ?
2. **Limite/hypothèse** : quel est le taux de faux positifs de MobSF ou
   CryptoGuard, et comment les auteurs distinguent-ils une vraie erreur de
   chiffrement d'une alerte non exploitable ?

### Rapporteur de A5 — ECDSA et nonces faibles

Synthèse d'une page à déposer à J+2, couvrant : la question, le mécanisme de
récupération de clé à partir de deux signatures de même `r`, les résultats
montrés, les points débattus (biais simulé vs biais réel, couverture des
données) et ce qui reste ouvert.
