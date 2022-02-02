#!/bin/bash

# airdrop_base() {
#     cd ../spl-token-faucet
#     # ANCHOR_WALLET=~/.config/solana/id.json ANCHOR_PROVIDER_URL=http://127.0.0.1:8899 node ./setup/usdc_airdrop.js
# }

initialize_credix_program_market() {
    # cd ../credix-permissioned-market
    ANCHOR_WALLET=~/.config/solana/id.json ANCHOR_PROVIDER_URL=https://api.devnet.solana.com npx ts-node ./setup/setup.ts
}

# echo "Airdrop base and create token account.."
# airdrop_base
echo "Initializing credix market.."
initialize_credix_program_market
