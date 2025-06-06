"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2, Heart, DollarSign, User, Wallet, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";

// MetaMask connection utilities
const connectToMetaMask = async () => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
  }

  try {
    // Request account access
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    // Switch to Sepolia network
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xAA36A7' }], // Sepolia testnet
      });
    } catch (switchError) {
      // If network doesn't exist, add it
      if (switchError.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0xAA36A7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          }],
        });
      } else {
        throw switchError;
      }
    }

    return accounts[0];
  } catch (error) {
    throw new Error(`Failed to connect to MetaMask: ${error.message}`);
  }
};

const getBalance = async (address) => {
  try {
    const balance = await window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    // Convert from wei to ETH
    return (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(6);
  } catch (error) {
    console.error('Error getting balance:', error);
    return '0.000000';
  }
};

export default function DonationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amountIDR, setAmountIDR] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [estimatedETH, setEstimatedETH] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletBalance, setWalletBalance] = useState("0.000000");
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Check if MetaMask is already connected
  useEffect(() => {
    const checkMetaMaskConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });

          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setIsConnected(true);
            const balance = await getBalance(accounts[0]);
            setWalletBalance(balance);
          }
        } catch (error) {
          console.error('Error checking MetaMask connection:', error);
        }
      }
    };

    checkMetaMaskConnection();

    // Listen for account changes
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          setIsConnected(false);
          setWalletAddress("");
          setWalletBalance("0.000000");
        } else {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          const balance = await getBalance(accounts[0]);
          setWalletBalance(balance);
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleConnectWallet = async () => {
    try {
      setConnecting(true);
      const address = await connectToMetaMask();
      setWalletAddress(address);
      setIsConnected(true);
      const balance = await getBalance(address);
      setWalletBalance(balance);
    } catch (error) {
      setResult({
        status: "error",
        message: error.message
      });
    } finally {
      setConnecting(false);
    }
  };

  const formatIDR = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isConnected) {
      newErrors.wallet = "Please connect your MetaMask wallet";
    }

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!amountIDR) {
      newErrors.amount = "Amount is required";
    } else if (Number(amountIDR) < 10000) {
      newErrors.amount = "Minimum donation is Rp 10,000";
    } else if (Number(amountIDR) > 1000000000) {
      newErrors.amount = "Maximum donation is Rp 1,000,000,000";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (amountIDR && Number(amountIDR) >= 10000) {
      const fetchETHPrice = async () => {
        try {
          setEstimatedETH("loading");
          const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr'
          );

          if (!response.ok) throw new Error("Failed to fetch price");

          const data = await response.json();
          const ethPriceInIDR = data.ethereum.idr;
          const ethAmount = Number(amountIDR) / ethPriceInIDR;

          setEstimatedETH({
            amount: ethAmount,
            rate: ethPriceInIDR,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error fetching ETH price:', error);
          setEstimatedETH("error");
        }
      };

      const timer = setTimeout(fetchETHPrice, 800);
      return () => clearTimeout(timer);
    } else {
      setEstimatedETH(null);
    }
  }, [amountIDR]);

  const handleDonate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setResult(null);

      // Step 1: Get transaction data from our API
      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount_idr: Number(amountIDR),
          wallet_address: walletAddress,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();

      if (data.status !== "success") {
        throw new Error(data.message || "Failed to prepare transaction");
      }

      // Step 2: Send transaction through MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: walletAddress,
          to: data.transactionData.to,
          value: '0x' + BigInt(data.transactionData.value).toString(16),
          data: data.transactionData.data,
          gas: '0x' + parseInt(data.transactionData.gasLimit).toString(16),
        }],
      });

      // Step 3: Show success result
      setResult({
        status: "success",
        txHash: txHash,
        ethAmount: data.ethAmount,
        name: data.name,
      });

      // Step 4: Log donation to Supabase
      try {
        const logResponse = await fetch("/api/donation-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: walletAddress,
            name: name.trim(),
            amount_idr: Number(amountIDR),
            amount_eth: data.ethAmount,
            tx_hash: txHash,
            status: "success",
          }),
        });

        if (!logResponse.ok) {
          console.warn("Failed to log donation to Supabase");
        }
      } catch (logError) {
        console.warn("Error logging donation:", logError);
      }

      // Step 5: Update wallet balance and clear form
      setTimeout(async () => {
        const newBalance = await getBalance(walletAddress);
        setWalletBalance(newBalance);
      }, 2000); // Wait a bit for transaction to be mined

      setName("");
      setAmountIDR("");
      setEstimatedETH(null);

    } catch (err) {
      console.error("Donation error:", err);

      let errorMessage = "An unexpected error occurred";

      if (err.code === 4001) {
        errorMessage = "Transaction cancelled by user";
      } else if (err.code === -32603) {
        errorMessage = "Transaction failed. Please check your wallet balance and try again.";
      } else if (err.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH balance to complete this transaction";
      } else if (err.message?.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (err.message === "Failed to fetch") {
        errorMessage = "Unable to connect to server. Please check your connection.";
      } else {
        errorMessage = err.message || errorMessage;
      }

      setResult({
        status: "error",
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleDonate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white mb-4">
            <Heart className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Make a Donation</h1>
          <p className="text-gray-600">Support our cause with cryptocurrency via MetaMask</p>
        </div>

        {/* MetaMask Connection Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-600" />
              MetaMask Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <div className="space-y-4">
                <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
                    Connect your MetaMask wallet to make a donation
                  </p>
                  <Button
                    onClick={handleConnectWallet}
                    disabled={connecting}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect MetaMask
                      </>
                    )}
                  </Button>
                </div>
                {errors.wallet && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.wallet}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">Wallet Connected</p>
                    <p className="text-xs text-green-600">Sepolia Testnet</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-green-700 mb-1">Address:</p>
                    <p className="text-xs text-green-600 font-mono break-all">{walletAddress}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-green-700">Balance:</span>
                    <span className="text-xs font-bold text-green-800">{walletBalance} ETH</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Form Card */}
        {isConnected && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Donation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your full name"
                  className={`transition-all ${errors.name ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-gray-700">
                  Donation Amount (IDR)
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Rp</span>
                  <Input
                    id="amount"
                    type="number"
                    value={amountIDR}
                    onChange={(e) => {
                      setAmountIDR(e.target.value);
                      if (errors.amount) setErrors(prev => ({ ...prev, amount: "" }));
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="100,000"
                    className={`pl-10 transition-all ${errors.amount ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}
                  />
                </div>
                {errors.amount && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.amount}
                  </p>
                )}
                {amountIDR && Number(amountIDR) >= 10000 && (
                  <p className="text-sm text-gray-600">
                    ≈ {formatIDR(Number(amountIDR))}
                  </p>
                )}
              </div>

              {/* ETH Estimation */}
              {estimatedETH && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  {estimatedETH === "loading" ? (
                    <div className="flex items-center gap-2 text-blue-700">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Getting latest ETH price...</span>
                    </div>
                  ) : estimatedETH === "error" ? (
                    <div className="text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      Unable to fetch current ETH price. Please try again.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-blue-700">
                        <strong>Estimated ETH:</strong> {estimatedETH.amount.toFixed(6)} ETH
                      </p>
                      <p className="text-xs text-blue-600">
                        Rate: {formatIDR(estimatedETH.rate)} per ETH
                      </p>
                      <p className="text-xs text-blue-500">
                        Updated: {estimatedETH.timestamp.toLocaleTimeString()} • Powered by CoinGecko
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Amount Buttons */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Quick Select</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[50000, 100000, 250000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmountIDR(amount.toString())}
                      className="text-xs hover:bg-blue-50 hover:border-blue-300"
                    >
                      {formatIDR(amount)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Donate Button */}
              <Button
                onClick={handleDonate}
                disabled={loading || !name.trim() || !amountIDR || !isConnected}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Donation...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Donate Now
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result Display */}
        {result && (
          <Card className={`shadow-lg border-2 ${result.status === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                {result.status === "success" ? (
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                )}

                <div className="flex-1 space-y-3">
                  {result.status === "success" ? (
                    <>
                      <div>
                        <h3 className="text-lg font-bold text-green-800 mb-1">
                          🎉 Donation Successful!
                        </h3>
                        <p className="text-sm text-green-600">
                          Your transaction has been processed successfully
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white/70 rounded-lg p-4 border border-green-200">
                          <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            Transaction Details
                          </h4>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-green-700 mb-1">From Wallet:</p>
                              <p className="text-xs text-green-600 font-mono">
                                {formatAddress(walletAddress)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-green-700 mb-1">Transaction Hash:</p>
                              <div className="bg-green-100 rounded-md p-2 border border-green-200">
                                <code className="text-xs text-green-800 font-mono break-all leading-relaxed">
                                  {result.txHash}
                                </code>
                              </div>
                              <a
                                href={`https://sepolia.etherscan.io/tx/${result.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 mt-1"
                              >
                                View on Etherscan <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-green-200">
                              <span className="text-sm font-medium text-green-700">ETH Sent:</span>
                              <span className="text-sm font-bold text-green-800">
                                {Number(result.ethAmount).toFixed(6)} ETH
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-100 rounded-lg p-3 border border-green-200">
                          <p className="text-sm text-green-700 text-center">
                            <strong>Thank you for your generous donation! 🙏</strong>
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-lg font-bold text-red-800 mb-1">
                          ❌ Donation Failed
                        </h3>
                        <p className="text-sm text-red-600">
                          There was an issue processing your donation
                        </p>
                      </div>

                      <div className="bg-white/70 rounded-lg p-4 border border-red-200">
                        <h4 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Error Details
                        </h4>
                        <p className="text-sm text-red-700">{result.message}</p>
                      </div>

                      <div className="bg-red-100 rounded-lg p-3 border border-red-200">
                        <p className="text-sm text-red-700 text-center">
                          Please try again or contact support if the issue persists.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pb-8">
          <p>Secured by MetaMask & Ethereum blockchain • Real-time rates by CoinGecko API</p>
        </div>
      </div>
    </div>
  );
}