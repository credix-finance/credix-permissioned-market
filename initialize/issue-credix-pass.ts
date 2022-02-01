import {issue_pass} from "../tests/utils";
import {PublicKey} from "@solana/web3.js";

const issueCredixPass = async () => {
  const publicKey = process.argv[2];

  console.log("Issuing Credix pass for", publicKey);

  await issue_pass(new PublicKey(publicKey));

  console.log("Issued Credix pass for", publicKey);
}

issueCredixPass();
