import * as anchor from '@project-serum/anchor';
import { Program } from '@project-serum/anchor';
import { CredixPermissionedMarket } from '../target/types/credix_permissioned_market';

describe('credix-permissioned-market', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  const program = anchor.workspace.CredixPermissionedMarket as Program<CredixPermissionedMarket>;

  // it('Is initialized!', async () => {
  //   // Add your test here.
  //   const tx = await program.rpc.initialize({});
  //   console.log("Your transaction signature", tx);
  // });
});
