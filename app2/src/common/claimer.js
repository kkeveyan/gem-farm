import { initGemFarm } from "./gemfarm";
import { PublicKey } from '@solana/web3.js';
import { fetchFarmer } from "./staker";
import env from "react-dotenv";

export async function claim(farm, connection, wallet) {
    console.log("farm: ", farm)
    let gf = await initGemFarm(connection, wallet)
    //console.log("gf is: ", gf)
    const farmAcc = await gf.fetchFarmAcc(new PublicKey(env.farm_id));
    await gf.claimWallet(
        new PublicKey(env.farm_id),
        new PublicKey(farmAcc.rewardA.rewardMint),
        new PublicKey(farmAcc.rewardB.rewardMint)
    );
    //await fetchFarmer();
};
