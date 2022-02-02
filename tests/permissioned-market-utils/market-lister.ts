import {
  Account,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  DexInstructions,
  TokenInstructions,
  OpenOrdersPda,
  MARKET_STATE_LAYOUT_V3,
} from "@project-serum/serum";
import * as anchor from "@project-serum/anchor";

// Creates a market on the dex.
export async function listCredixMarket({
  connection,
  wallet,
  baseMint,
  quoteMint,
  baseLotSize,
  quoteLotSize,
  dexProgramId,
  proxyProgramId,
  feeRateBps,
}) {
  const market =new Account();
  const requestQueue = new Account();
  const eventQueue = new Account();
  const bids = new Account();
  const asks = new Account();
  const baseVault = new Account();
  const quoteVault = new Account();
  const pruneAuthority = new Account();
  const crankAuthority = new Account();
  const quoteDustThreshold = new anchor.BN(100);

  const [vaultOwner, vaultSignerNonce] = await getVaultOwnerAndNonce(
    market.publicKey,
    dexProgramId
  );

  const tx1 = new Transaction();
  tx1.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: baseVault.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(165),
      space: 165,
      programId: TOKEN_PROGRAM_ID,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: quoteVault.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(165),
      space: 165,
      programId: TOKEN_PROGRAM_ID,
    }),
    TokenInstructions.initializeAccount({
      account: baseVault.publicKey,
      mint: baseMint,
      owner: vaultOwner,
    }),
    TokenInstructions.initializeAccount({
      account: quoteVault.publicKey,
      mint: quoteMint,
      owner: vaultOwner,
    })
  );

  const tx2 = new Transaction();
  tx2.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: market.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(
        MARKET_STATE_LAYOUT_V3.span
      ),
      space: MARKET_STATE_LAYOUT_V3.span,
      programId: dexProgramId,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: requestQueue.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(5120 + 12),
      space: 5120 + 12,
      programId: dexProgramId,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: eventQueue.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(262144 + 12),
      space: 262144 + 12,
      programId: dexProgramId,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: bids.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(65536 + 12),
      space: 65536 + 12,
      programId: dexProgramId,
    }),
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: asks.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(65536 + 12),
      space: 65536 + 12,
      programId: dexProgramId,
    })
  );

  const tx3 = new Transaction();
  tx3.add(
    DexInstructions.initializeMarket({
      market: market.publicKey,
      requestQueue: requestQueue.publicKey,
      eventQueue: eventQueue.publicKey,
      bids: bids.publicKey,
      asks: asks.publicKey,
      baseVault: baseVault.publicKey,
      quoteVault: quoteVault.publicKey,
      baseMint,
      quoteMint,
      baseLotSize: new anchor.BN(baseLotSize),
      quoteLotSize: new anchor.BN(quoteLotSize),
      feeRateBps,
      vaultSignerNonce,
      quoteDustThreshold,
      programId: dexProgramId,
      authority: await OpenOrdersPda.marketAuthority(
        market.publicKey,
        dexProgramId,
        proxyProgramId
      ),
      pruneAuthority: pruneAuthority.publicKey,
      crankAuthority: crankAuthority.publicKey,
    })
  );

  const transactions = [
    { transaction: tx1, signers: [baseVault, quoteVault] },
    {
      transaction: tx2,
      signers: [market, requestQueue, eventQueue, bids, asks],
    },
    {
      transaction: tx3,
      signers: [],
    },
  ];
  for (let tx of transactions) {
    await anchor.getProvider().send(tx.transaction, tx.signers);
  }
  const acc = await connection.getAccountInfo(market.publicKey);

  return [market.publicKey, vaultOwner];
}

async function getVaultOwnerAndNonce(marketPublicKey, dexProgramId) {
  const nonce = new anchor.BN(0);
  while (nonce.toNumber() < 255) {
    try {
      const vaultOwner = await PublicKey.createProgramAddress(
        [marketPublicKey.toBuffer(), nonce.toArrayLike(Buffer, "le", 8)],
        dexProgramId
      );
      return [vaultOwner, nonce];
    } catch (e) {
      nonce.iaddn(1);
    }
  }
  throw new Error("Unable to find nonce");
}

// Dummy keypair for a consistent market address. Helpful when doing UI work.
// Don't use in production.
const MARKET_KP = new Account([
  13, 174, 53, 150, 78, 228, 12, 98, 170, 254, 212, 211, 125, 193, 2, 241, 97,
  137, 49, 209, 189, 199, 27, 215, 220, 65, 57, 203, 215, 93, 105, 203, 217, 32,
  5, 194, 157, 118, 162, 47, 102, 126, 235, 65, 99, 80, 56, 231, 217, 114, 25,
  225, 239, 140, 169, 92, 150, 146, 211, 218, 183, 139, 9, 104,
]);
