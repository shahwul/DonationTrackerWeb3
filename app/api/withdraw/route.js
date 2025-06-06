import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import abiDonation from '@/abi/Donation.json';

const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');

const contractAddress = process.env.SEPOLIA_DONATION_ADDRESS;

export async function POST(req) {
    try {
        const { private_key } = await req.json();

        if (!private_key) {
            return NextResponse.json({ status: 'error', message: 'Private key is required' }, { status: 400 });
        }

        // Membuat signer dari private key user
        const signer = new ethers.Wallet(private_key, provider);

        // Inisialisasi kontrak Donation
        const donationContract = new ethers.Contract(contractAddress, abiDonation, signer);

        // Panggil fungsi withdraw
        const tx = await donationContract.withdraw();
        await tx.wait();

        return NextResponse.json({
            status: 'success',
            txHash: tx.hash,
        });

    } catch (err) {
        console.error("Withdraw error:", err);
        return NextResponse.json({ status: 'error', message: err.message }, { status: 500 });
    }
}
