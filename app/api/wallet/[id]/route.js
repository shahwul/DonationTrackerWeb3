import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Ganti sesuai dengan RPC provider (Hardhat / testnet / mainnet)
// const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
// const provider = new ethers.JsonRpcProvider("https://ethereum-holesky-rpc.publicnode.com");
const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");

export async function GET(request, { params }) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    const { data: wallets, error } = await supabase
      .from("wallet")
      .select("*")
      .eq("user_id", id);

    if (error || !wallets || wallets.length === 0) {
      return NextResponse.json({ error: "No wallets found" }, { status: 404 });
    }

    const enriched = await Promise.all(
      wallets.map(async (data) => {
        try {
          const wallet = new ethers.Wallet(data.private_key, provider);
          const balanceWei = await provider.getBalance(wallet.address);
          const balanceEth = ethers.formatEther(balanceWei);

          return {
            id: data.id,
            private_key: data.private_key,
            address: wallet.address,
            balance: balanceEth,
          };
        } catch (err) {
          return {
            id: data.id,
            private_key: data.private_key,
            address: null,
            balance: null,
            error: 'Failed to fetch wallet info',
          };
        }
      })
    );

    return NextResponse.json({
      wallets: enriched,
      length: enriched.length,
    });
  } catch (error) {
    console.error("Failed to fetch wallet info:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
