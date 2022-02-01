# Credix permissioned market


## Testing 
```bash
anchor test
```

## Deploy on Localnet
```
anchor localnet
```
Go to www.spl-token-faucet.com, drop yourself some SOL and USDC on localnet

Setup credix-market and list on serum
```
ANCHOR_WALLET=~/.config/solana/s.json ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 npx ts-node ./setup/setup.ts
```

## Issue credix- and Civic passes locally

In order to manually issue Civic tokens locally:

```shell
 ANCHOR_WALLET=~/.config/solana/id.json ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 npx ts-node ./initialize/issue-civic-token.ts Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL
```

In order to manually issue Credix passes locally:

```shell
 ANCHOR_WALLET=~/.config/solana/id.json ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 npx ts-node ./initialize/issue-credix-pass.ts Ej5zJzej7rrUoDngsJ3jcpfuvfVyWpcDcK7uv9cE2LdL
```