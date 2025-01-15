// Import required modules and classes from the 'aptos' library
import { AptosClient, AptosAccount, FaucetClient, TransactionBuilderEd25519 } from 'aptos';

// Define the URL for the Aptos blockchain node (Devnet) and the Faucet service
const NODE_URL = 'https://fullnode.devnet.aptoslabs.com';
const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com';

// Create an Aptos client to interact with the blockchain node
const client = new AptosClient(NODE_URL);

// Create a Faucet client to fund accounts using the Devnet faucet
const faucet = new FaucetClient(NODE_URL, FAUCET_URL);

// Create a new Aptos account (this generates a private/public key pair and a new address)
const account = new AptosAccount();

// Fund the new account using the faucet, adding 1,000,000 micro-coins (1 Aptos coin)
// Note: `account.address()` retrieves the address of the account
await faucet.fundAccount(account.address(), 1000000);

// Function to send a transaction to the Aptos blockchain
async function sendTransaction(transactionPayload) {
  // Generate a raw transaction request for the account, using the provided payload
  const txnRequest = await client.generateTransaction(account.address(), transactionPayload);

  // Sign the transaction with the account's private key
  const signedTxn = await client.signTransaction(account, txnRequest);

  // Submit the signed transaction to the blockchain
  const transactionRes = await client.submitTransaction(signedTxn);

  // Wait for the transaction to be processed on the blockchain
  await client.waitForTransaction(transactionRes.hash);

  // Return the transaction hash (a unique identifier for the transaction)
  return transactionRes.hash;
}

// Function to send a batch of transactions sequentially
async function sendBatchTransactions() {
  // Create an array to store the transaction hashes for tracking purposes
  const transactionHashes = [];

  // Define the recipient's address (replace '0xRECEIVER_ADDRESS_HERE' with the actual address)
  const receiverAddress = '0xRECEIVER_ADDRESS_HERE';

  // Define the first transaction payload for transferring 10 micro-coins
  const transferPayload1 = {
    type: 'script_function_payload',       // Type of transaction (script function)
    function: '0x1::coin::transfer',       // The function being called in the Aptos framework
    arguments: [receiverAddress, 10],     // Arguments: recipient address and amount to transfer
    type_arguments: ['0x1::aptos_coin::AptosCoin'], // Coin type for the transaction
  };

  // Define the second transaction payload for transferring 20 micro-coins
  const transferPayload2 = {
    type: 'script_function_payload',
    function: '0x1::coin::transfer',
    arguments: [receiverAddress, 20],
    type_arguments: ['0x1::aptos_coin::AptosCoin'],
  };

  // Combine the two transactions into an array for batch processing
  const transactions = [transferPayload1, transferPayload2];

  // Loop through each transaction payload, send the transaction, and track its hash
  for (const txPayload of transactions) {
    const txHash = await sendTransaction(txPayload); // Send the transaction and get its hash
    transactionHashes.push(txHash); // Store the transaction hash in the array
    console.log(`Transaction submitted with hash: ${txHash}`); // Log the transaction hash
  }

  // Log all transaction hashes once the batch is complete
  console.log('Batch transactions complete:', transactionHashes);
}

// Call the batch transaction function and handle any errors
sendBatchTransactions().catch(console.error);