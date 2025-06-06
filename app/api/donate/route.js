// app/api/donate/route.js
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import abiDonation from '../../../abi/Donation.json';
import abiOracle from '../../../abi/Oracle.json';
import axios from 'axios';

const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

const contractAddress = process.env.SEPOLIA_DONATION_ADDRESS;
const oracleAddress = process.env.SEPOLIA_ORACLE_ADDRESS;

export async function POST(req) {
    try {
        const body = await req.json();
        const { name, amount_idr, private_key } = body;

        if (!name || !amount_idr || !private_key) {
            return NextResponse.json({ status: 'error', message: 'Missing fields' }, { status: 400 });
        }

        const signer = new ethers.Wallet(private_key, provider);
        const donationContract = new ethers.Contract(contractAddress, abiDonation, signer);
        const oracleContract = new ethers.Contract(oracleAddress, abiOracle, signer);

        const ethtoUSD = await oracleContract.getEthToUsd();
        const USDtoIDR = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=idr');

        const amountETH = Number(amount_idr) / (Number(USDtoIDR.data.usd.idr) * Number(ethtoUSD) / 1e8);

        const tx = await donationContract.donate(name, {
            value: ethers.parseEther(amountETH.toFixed(18)),
        });
        await tx.wait();

        return NextResponse.json({
            status: 'success',
            txHash: tx.hash,
            ethAmount: amountETH,
            name: name,
        });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
    }
}
