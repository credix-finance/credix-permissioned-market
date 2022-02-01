import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import {
  addGatekeeper,
  issueVanilla,
  getGatewayTokenKeyForOwner,
  getGatekeeperAccountKey,
  findGatewayToken,
} from "@identity.com/solana-gateway-ts";
import * as fs from "fs";

let provider = anchor.Provider.env();
anchor.setProvider(provider);
// bug in 0.19.0
// @ts-ignore
const program = anchor.workspace.Credix;

//export const baseMintAuthority = anchor.web3.Keypair.generate();
export const payer = anchor.web3.Keypair.generate();
export const GLOBAL_MARKET_SEED = "credix-market";
export const lpTokenMint = anchor.web3.Keypair.generate();

// Implementation to go from a string byte array to byte array
const stringByteArrayToByteArray = (path: string) => {
  return Uint8Array.from(JSON.parse(fs.readFileSync(path, "utf8")));
};

// Civic Authentication
export const gatekeeperNetwork = anchor.web3.Keypair.fromSecretKey(
  stringByteArrayToByteArray(
    process.env.HOME + "/.config/solana/local-random-gatekeeper-network.json"
  )
);

export const gatekeeperAuthority = anchor.web3.Keypair.generate();

export const initialize_gatekeeper = async () => {
  const addGatekeeperInstruction = addGatekeeper(
    provider.wallet.publicKey,
    await getGatekeeperAccountKey(
      gatekeeperAuthority.publicKey,
      gatekeeperNetwork.publicKey
    ),
    gatekeeperAuthority.publicKey,
    gatekeeperNetwork.publicKey
  );
  const transaction = await provider.connection.sendTransaction(
    new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
    }).add(addGatekeeperInstruction),
    [program.provider.wallet.payer, gatekeeperNetwork],
    {
      preflightCommitment: "confirmed",
    }
  );
  await provider.connection.confirmTransaction(transaction, "confirmed");
};

export const get_gateway_token = async (owner: PublicKey) => {
  return await findGatewayToken(
    provider.connection,
    owner,
    gatekeeperNetwork.publicKey
  );
};

// Issue Credix pass / Civic token
export const issue_pass = async (publicKey: PublicKey) => {
  const [credixPassPDA, passBump] = await get_credix_pass_pda(
    publicKey,
    GLOBAL_MARKET_SEED
  );
  const [globalMarketStatePda, _globalMarketStateBump] =
    await get_global_market_state_pda(GLOBAL_MARKET_SEED);

  await program.rpc.createCredixPass(passBump, {
    accounts: {
      owner: provider.wallet.publicKey,
      globalMarketState: globalMarketStatePda,
      passHolder: publicKey,
      credixPass: credixPassPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [],
  });
};

export const issue_token = async (owner: PublicKey) => {
  const issueVanillaInstruction = await issueVanilla(
    await getGatewayTokenKeyForOwner(owner, gatekeeperNetwork.publicKey),
    provider.wallet.publicKey,
    await getGatekeeperAccountKey(
      gatekeeperAuthority.publicKey,
      gatekeeperNetwork.publicKey
    ),
    owner,
    gatekeeperAuthority.publicKey,
    gatekeeperNetwork.publicKey
  );
  const transaction = await provider.connection.sendTransaction(
    new anchor.web3.Transaction({
      feePayer: provider.wallet.publicKey,
    }).add(issueVanillaInstruction),
    [program.provider.wallet.payer, gatekeeperAuthority],
    {
      preflightCommitment: "confirmed",
    }
  );
  await provider.connection.confirmTransaction(transaction, "confirmed");
};

// Airdrops
export const aidrop_sol = async (publicKey: PublicKey) => {
  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(publicKey, 10000000000),
    "confirmed"
  );
};

export const airdrop_mint = async (
  mint: Token,
  mintAuthority: anchor.web3.Keypair,
  tokenAccount: PublicKey,
  amount?: number
) => {
  await mint.mintTo(
    tokenAccount,
    mintAuthority.publicKey,
    [mintAuthority],
    amount || 100000000000
  );
};

export const get_global_market_state_pda = async (globalMarketSeed: string) => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode(globalMarketSeed))],
    program.programId
  );
};

export const get_signing_authority_pda = async (globalMarketPK: PublicKey) => {
  return await PublicKey.findProgramAddress(
    [globalMarketPK.toBuffer()],
    program.programId
  );
};

export const get_credix_pass_pda = async (
  address: PublicKey,
  globalMarketStateSeed: string
) => {
  const [globalMarketStatePda, _globalMarketStateBump] =
    await get_global_market_state_pda(globalMarketStateSeed);

  return await anchor.web3.PublicKey.findProgramAddress(
    [
      globalMarketStatePda.toBuffer(),
      address.toBuffer(),
      Buffer.from(anchor.utils.bytes.utf8.encode("credix-pass")),
    ],
    program.programId
  );
};


// Get Associated Token Address
export const get_associated_token_address = async (
  mint: PublicKey,
  owner: PublicKey
) => {
  return await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    mint,
    owner,
    true
  );
};

// Credix pass
export const create_credix_pass = async (
  pda: PublicKey,
  bump: number,
  publicKey: PublicKey,
  globalMarketStateSeed: string,
  owner?: PublicKey
) => {
  const [globalMarketStatePda, _globalMarketStateBump] =
    await get_global_market_state_pda(globalMarketStateSeed);

  await program.rpc.createCredixPass(bump,  {
    accounts: {
      owner: owner ? owner : provider.wallet.publicKey,
      passHolder: publicKey,
      globalMarketState: globalMarketStatePda,
      credixPass: pda,
      systemProgram: anchor.web3.SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    },
    signers: [],
  });
};

export const update_credix_pass = async (
  values: [boolean, boolean, boolean],
  pda: PublicKey,
  publicKey: PublicKey,
  owner?: PublicKey
) => {
  const [globalMarketStatePda, _globalMarketStateBump] =
    await get_global_market_state_pda(GLOBAL_MARKET_SEED);

  await program.rpc.updateCredixPass(false, {
    accounts: {
      owner: owner ? owner : provider.wallet.publicKey,
      passHolder: publicKey,
      globalMarketState: globalMarketStatePda,
      credixPass: pda,
    },
    signers: [],
  });
};
