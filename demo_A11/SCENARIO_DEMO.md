# Scénario exact de la démonstration A11 (Groupe 4)

Durée visée : **5 à 6 minutes**.

## Avant la séance — à faire une fois

Dans un terminal :

```bash
cd demo_A11
npm install
npm test
```

Vérifier que le résultat est **7 passing**. Ouvrir ensuite dans l'éditeur :

- `contracts/VulnerableVault.sol`
- `contracts/Attacker.sol`
- `contracts/FixedVault.sol`
- `test/vault.test.js`

Préparer aussi un terminal propre dans `demo_A11` pour lancer les commandes.

## Ce qu'on montre à la classe

| Moment | Fichier | Lignes | Ce qu'on montre |
|---|---|---|---|
| Faille | `contracts/VulnerableVault.sol` | 18–27 | `retirer()` : envoi des ETH **avant** la remise à zéro |
| Attaque | `contracts/Attacker.sol` | 18–24 | `attaquer()` dépose 1 ETH puis appelle `retirer()` |
| Attaque | `contracts/Attacker.sol` | 26–31 | `receive()` rappelle `retirer()` à chaque réception |
| Preuve | terminal | — | `npm run demo:vulnerable` : coffre vidé |
| Tests | `test/vault.test.js` | 43–55, 57–65, 79–104 | les 7 tests, dont attaque et correction |
| Correction | `contracts/FixedVault.sol` | 14–19 | verrou `nonReentrant` |
| Correction | `contracts/FixedVault.sol` | 27–44 | état mis à zéro **avant** l'appel externe |
| Preuve | terminal | — | `npm run demo:fixed` : attaque bloquée, Alice récupère 10 ETH |
| Outil | terminal | — | Slither : `reentrancy-eth` sur vulnérable, rien sur corrigé |

## Déroulé du début à la fin

### 0. Annonce — 20 s

> « Notre démonstration répond à la question A11 : que détectent vraiment les
> outils ? Nous allons reproduire une réentrance réelle sur un réseau Hardhat
> local, puis montrer que Slither la détecte et que la correction la bloque. »

### 1. Montrer la faille — 40 s

Afficher `contracts/VulnerableVault.sol`, lignes 18–27.

Dire :

> « `retirer()` lit le solde, envoie les ETH à l'appelant, puis seulement après
> remet le solde à zéro. L'ordre est dangereux : l'appel externe de la ligne 22
> arrive avant la mise à jour de la ligne 25. »

Ne pas encore parler de l'attaquant.

### 2. Montrer l'attaquant — 40 s

Afficher `contracts/Attacker.sol`.

Montrer `attaquer()` lignes 18–24 :

> « Le contrat attaquant dépose 1 ETH, puis appelle `retirer()`. »

Montrer `receive()` lignes 26–31 :

> « À chaque fois qu'il reçoit des ETH, `receive()` rappelle `retirer()`. Comme
> le coffre n'a pas encore remis le solde à zéro, il croit que l'attaquant a
> toujours 1 ETH et renvoie 1 ETH. »

### 3. Exécuter l'attaque — 1 min

Lancer :

```bash
npm run demo:vulnerable
```

Lire les résultats à voix haute :

- `Reentrances executees : 10`
- `Solde du coffre : 0.0 ETH`
- `Solde du contrat attaquant : 11.0 ETH`
- `Solde enregistre d'Alice : 10.0 ETH`
- `Alice tente de retirer : REVERT ... 'envoi echoue'`
- `Transfert des 11 ETH vers Modou`

Phrase :

> « Le coffre est vide, alors que son registre indique encore 10 ETH à Alice.
> Alice ne peut plus retirer : l'argent est parti chez l'attaquant. »

### 4. Montrer les tests — 1 min

Lancer :

```bash
npm test
```

Montrer `7 passing`, puis expliquer rapidement :

- test 2 : le coffre vulnérable est vidé ;
- test 3 : Alice ne peut plus retirer ;
- test 5 : le coffre corrigé bloque l'attaque ;
- test 6 : Alice garde ses 10 ETH.

Optionnel pour gagner du temps :

```bash
npx hardhat test --grep "vide le coffre"
```

### 5. Montrer la correction — 1 min

Afficher `contracts/FixedVault.sol`.

Montrer le verrou lignes 14–19 :

> « `nonReentrant` empêche un deuxième appel pendant qu'un retrait est en cours. »

Montrer `retirer()` lignes 27–44 :

> « La ligne 31 remet le solde à zéro avant l'appel externe de la ligne 33 :
> c'est l'ordre vérifier–modifier–interagir. Même si `receive()` rappelle
> `retirer()`, le verrou est déjà pris et le solde vaut déjà zéro. »

### 6. Exécuter la correction — 40 s

Lancer :

```bash
npm run demo:fixed
```

Lire :

- `Attaque bloquee : REVERT ... 'reentrance bloquee'`
- `Reentrances executees : 0`
- `Solde du coffre : 10.0 ETH`
- `Solde enregistre d'Alice : 10.0 ETH`
- `Alice retire ses fonds : 0.0 ETH`
- `Solde final du coffre : 0.0 ETH`

Phrase :

> « L'attaque échoue, Alice garde ses 10 ETH et peut les retirer. »

### 7. Montrer Slither — 1 min

Lancer :

```bash
slither contracts/VulnerableVault.sol --detect reentrancy-eth
slither contracts/FixedVault.sol --detect reentrancy-eth
```

Sortie attendue pour le coffre vulnérable :

```text
Detector: reentrancy-eth
Reentrancy in VulnerableVault.retirer() (contracts/VulnerableVault.sol#18-27):
	External calls:
	- (ok,None) = msg.sender.call{value: montant}() (contracts/VulnerableVault.sol#22)
	State variables written after the call(s):
	- balances[msg.sender] = 0 (contracts/VulnerableVault.sol#25)
```

Sortie attendue pour le coffre corrigé :

```text
INFO:Slither:contracts/FixedVault.sol analyzed (2 contracts with 1 detectors), 0 result(s) found
```

Phrase :

> « Slither retrouve exactement les lignes 22 et 25 : il détecte bien cette
> réentrance réelle. Il ne signale rien sur le coffre corrigé. Mais attention :
> une alerte ne prouve pas toujours l'exploitabilité, et l'absence d'alerte ne
> prouve pas la sécurité. C'est pour cela que notre projet mesure aussi les
> faux positifs et les fautes manquées sur au moins 20 contrats annotés. »

### 8. Conclusion — 20 s

> « La réentrance vient de l'ordre des instructions. Solidity 0.8 ne la corrige
> pas. Ici, l'outil détecte la faille réelle, et la correction consiste à
> mettre l'état à jour avant tout appel externe, avec un verrou en plus. »

## Répartition de la parole (3 membres)

- **Mohamed LO** : question de recherche + faille dans `VulnerableVault.sol`.
- **Ahmadoul Khadim TOURE** : contrat attaquant + exécution `demo:vulnerable` + tests.
- **Amadou Tidiane KANE** : correction `FixedVault.sol` + exécution `demo:fixed` + Slither + conclusion.

## Pièges à éviter

- Ne pas dire que Solidity 0.8 corrige la réentrance : c'est faux.
- Ne pas montrer `node_modules`, `package-lock.json` ni le détail des scripts.
- Ne pas lancer d'attaque sur un réseau public : tout reste local.
- Vérifier `npm test` juste avant de passer : si `node_modules` a été copié
  depuis un autre système, relancer `npm install`.
- Si Slither n'est pas installé le jour J, montrer une capture d'écran de la
  sortie préparée à l'avance, puis passer directement à la conclusion.
