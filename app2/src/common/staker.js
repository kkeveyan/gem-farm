import { initGemBank } from "./gemBank";
import { BN } from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import env from "react-dotenv";
import { stringifyPKsAndBNs } from '@gemworks/gem-farm-ts';

// const network = "https://api.devnet.solana.com";
// const connection = new Connection(network, "confirmed");
// async function getProvider() {
//     /* create the provider and return it to the caller */
//     /* network set to local network for now */
//     const network = "https://api.devnet.solana.com";
//     const connection = new Connection(network, opts.preflightCommitment);

//     const provider = new Provider(
//         connection, wallet, opts.preflightCommitment,
//     );
//     return provider;
// }
// const provider = await getProvider()
// let gb = await initGemBank(connection, provider)
// const bank = ref < PublicKey > ();
// const vault = ref < PublicKey > ();
// const vaultAcc = ref < any > ();
// const gdrs = ref < PublicKey[] > ([]);
// const vaultLocked = ref < boolean > (false);



const fetchFarn = async () => {
    const farmAcc = await gf.fetchFarmAcc(new PublicKey(env.farm_id));
    console.log(
        `farm found at ${env.farm_id}:`,
        stringifyPKsAndBNs(farmAcc.value)
    );
};
const fetchFarmer = async (wallet) => {
    const [farmerPDA] = await gf.findFarmerPDA(
        new PublicKey(env.farm_id),
        wallet.publicKey
    );
    const farmerIdentity = getWallet().publicKey?.toBase58();
    const farmerAcc = await gf.fetchFarmerAcc(farmerPDA);
    const farmerState = gf.parseFarmerState(farmerAcc);
    await updateAvailableRewards();
    console.log(
        `farmer found at ${farmerIdentity.value}:`,
        stringifyPKsAndBNs(farmerAcc.value)
    );
};


export async function depositNftsOnChain(nft) {

    console.log(nft);
    const creator = new PublicKey(
        //todo currently simply taking the 1st creator
        nft.onchainMetadata.data.creators[0].address
    );
    console.log('creator is', creator.toBase58());
    await depositGem(nft.mint, creator, nft.pubkey);


};
export async function freshStart(wallet, connection) {
    if (wallet && connection) {
        const gf = await initGemFarm(connection, wallet);
        farmerIdentity.value = wallet.publicKey?.toBase58();
        //reset stuff
        farmAcc.value = undefined;
        farmerAcc.value = undefined;
        farmerState.value = undefined;
        availableA.value = undefined;
        availableB.value = undefined;
        try {
            await fetchFarn();
            await fetchFarmer(wallet);
        } catch (e) {
            console.log(`farm with PK ${env.farm_id} not found :(`);
        }
    }
};


const depositGem = async (mint, creator, source) => {
    const { txSig } = await gb.depositGemWallet(
        bank.value,
        vault.value,
        new BN(1),
        mint,
        source,
        creator
    );
    console.log('deposit done', txSig);
};

const addSingleGem = async (
    gemMint,
    gemSource,
    creator
) => {
    await gf.flashDepositWallet(
        new PublicKey(env.farm_id),
        '1',
        gemMint,
        gemSource,
        creator
    );
    await fetchFarmer();
};
