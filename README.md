# Credix permissioned market

## Testing

```bash
anchor test
```

## Deploy on Localnet

```
anchor localnet
```

Setup credix-market and list on serum

```
ANCHOR_WALLET=~/.config/solana/id.json ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 npx ts-node ./setup/setup.ts
```
