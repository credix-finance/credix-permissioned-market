# Credix permissioned market

The credix permissioned market is a "permissioned market" on Serum via a proxy program. It is a regular serum market with the additional checks for CIVIC pass, Credix Pass. Along with these checks it also sends an instruction to the `credix` Program to thaw LP tokens before calling the dex instruction and freeze them again right after that.

## Programs

### Credix:

This is a dummy program for Credix market, it contains instructions to initialize market, deposit funds and get LP tokens, create an credix pass, update credix pass. Anyone can initiate these instructions. It also contains instruction to freeze LP Tokens and thaw LP tokens. For calling them the transaction must be signed by the signing-authority PDA of credix-permissioned-market program. This way we make sure that no one can thaw their LP tokens and transfer them to a public key that doesn't have Credix pass or civic pass.

### Credix-permissioned-market

This is the proxy program, we can created it with [permissioned package](https://github.com/project-serum/serum-dex/tree/master/dex/permissioned). Along with the proxy instructions to the dex program it contains a  instruction to create the signing-authority PDA.
The programs's main role is to create a thaw LP instruction    before calling the dex instruction and a freeze LP instruction after that.

#### Permissioned package

Unfortunately [crates.io version](https://crates.io/crates/serum-dex-permissioned) of the package was outdated, So we had to clone it locally and do changes in cargo.toml to make it work. We also had to adjust the order in which the calls the made. You can find the local package in `root/permissioned` directory.

## Testing

You can run the following command to test the programs:

```bash
anchor test
```

## Deploy on Localnet

To deploy all the required program and start the solana test validator:

```
anchor localnet
```

Setup credix-market and list on serum dex program:

```
ANCHOR_WALLET=~/.config/solana/s.json ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 npx ts-node ./setup/setup.ts
```
