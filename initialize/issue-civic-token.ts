import {initialize_gatekeeper, issue_token} from "../tests/utils";
import {PublicKey} from "@solana/web3.js";

const issueCivicToken = async () => {
  const publicKey = process.argv[2];

  console.log("Issuing Civic token for", publicKey);

  await initialize_gatekeeper();
  await issue_token(new PublicKey(publicKey));

  console.log("Issued Civic token for", publicKey);
}

issueCivicToken();
