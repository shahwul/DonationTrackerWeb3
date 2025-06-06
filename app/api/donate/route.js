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
        const { name, amount_idr, wallet_address } = body;

        if (!name || !amount_idr || !wallet_address) {
            return NextResponse.json({
                status: 'error',
                message: 'Missing required fields: name, amount_idr, or wallet_address'
            }, { status: 400 });
        }

        // Validate wallet address format
        if (!ethers.isAddress(wallet_address)) {
            return NextResponse.json({
                status: 'error',
                message: 'Invalid wallet address format'
            }, { status: 400 });
        }

        // Get ETH to USD price from oracle
        const oracleContract = new ethers.Contract(oracleAddress, abiOracle, provider);
        const ethToUsdPrice = await oracleContract.getEthToUsd();

        // Get USD to IDR rate from CoinGecko
        const usdToIdrResponse = await axios.get(
            'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=idr',
            { timeout: 10000 }
        );

        const usdToIdrRate = usdToIdrResponse.data.usd.idr;

        // Calculate ETH amount needed
        // ETH price in USD = ethToUsdPrice / 1e8 (oracle returns price with 8 decimals)
        // ETH price in IDR = (ethToUsdPrice / 1e8) * usdToIdrRate
        // ETH amount = amount_idr / ETH price in IDR
        const ethPriceInUsd = Number(ethToUsdPrice) / 1e8;
        const ethPriceInIdr = ethPriceInUsd * usdToIdrRate;
        const amountETH = Number(amount_idr) / ethPriceInIdr;

        // Validate minimum ETH amount (to avoid dust transactions)
        if (amountETH < 0.000001) {
            return NextResponse.json({
                status: 'error',
                message: 'Donation amount too small. Please increase the amount.'
            }, { status: 400 });
        }

        // Return transaction data for MetaMask to process
        // MetaMask will handle the actual transaction signing and submission
        return NextResponse.json({
            status: 'success',
            transactionData: {
                to: contractAddress,
                value: ethers.parseEther(amountETH.toFixed(18)).toString(),
                data: new ethers.Interface(abiDonation).encodeFunctionData('donate', [name]),
                gasLimit: '100000', // Estimated gas limit
            },
            ethAmount: amountETH,
            ethPriceInUsd: ethPriceInUsd,
            ethPriceInIdr: ethPriceInIdr,
            name: name,
        });

    } catch (err) {
        console.error('Donation API Error:', err);

        let errorMessage = 'An unexpected error occurred';

        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            errorMessage = 'Request timeout. Please check your connection and try again.';
        } else if (err.message.includes('network')) {
            errorMessage = 'Network error. Please check your connection.';
        } else if (err.message.includes('oracle') || err.message.includes('contract')) {
            errorMessage = 'Smart contract error. Please try again later.';
        } else if (axios.isAxiosError(err)) {
            errorMessage = 'Failed to fetch current exchange rates. Please try again.';
        }

        return NextResponse.json({
            status: 'error',
            message: errorMessage
        }, { status: 500 });
    }
}