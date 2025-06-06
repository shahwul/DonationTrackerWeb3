"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Loader2, Heart, DollarSign, User, Wallet, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function DonationPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [amountIDR, setAmountIDR] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [estimatedETH, setEstimatedETH] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [selectedWalletId, setSelectedWalletId] = useState("");
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [userId, setUserId] = useState(null);
  const [walletsLoading, setWalletsLoading] = useState(true);

  // ✅ Ambil user Supabase dan wallets saat halaman dimuat
  useEffect(() => {
    const checkAuthAndFetchWallets = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // Fetch all wallets by user.id
      try {
        setWalletsLoading(true);
        const res = await fetch(`/api/wallet/${user.id}`);
        if (!res.ok) throw new Error("Wallets not found");

        const walletsData = await res.json();
        console.log("Fetched wallets:", walletsData.wallets[0]);
        setWallets(walletsData);

        // Auto-select first wallet if available
        if (walletsData.length > 0) {
          setSelectedWalletId(walletsData.wallets[0].id);
          setSelectedWallet(walletsData.wallets[0]);
        }
      } catch (err) {
        console.error("Failed to fetch wallets:", err);
        setWallets([]);
      } finally {
        setWalletsLoading(false);
      }
    };

    checkAuthAndFetchWallets();
  }, [router]);

  // Update selected wallet when wallet ID changes
  useEffect(() => {
    if (selectedWalletId && wallets.length > 0) {
      const wallet = wallets.wallets.find(w => w.id === selectedWalletId);
      setSelectedWallet(wallet || null);
    }
  }, [selectedWalletId, wallets]);

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

    if (!selectedWalletId) {
      newErrors.wallet = "Please select a wallet";
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
    if (!selectedWallet?.private_key) {
      setResult({ status: "error", message: "Selected wallet not found or invalid" });
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch("/api/donate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount_idr: Number(amountIDR),
          private_key: selectedWallet.private_key,
        }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setResult(data);

      if (data.status === "success") {
        // simpan ke Supabase
        const log = await fetch("/api/donate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            wallet_id: selectedWalletId,
            name: name.trim(),
            amount_idr: Number(amountIDR),
            amount_eth: data.ethAmount,
            tx_hash: data.txHash,
            status: "success",
          }),
        });

        if (!log.ok) {
          console.warn("Failed to log donation to Supabase");
        }

        setName("");
        setAmountIDR("");
        setEstimatedETH(null);
      }

    } catch (err) {
      console.error("Donation error:", err);
      setResult({
        status: "error",
        message: err.message === "Failed to fetch"
          ? "Unable to connect to server. Please check your connection."
          : err.message || "An unexpected error occurred"
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
          <p className="text-gray-600">Support our cause with cryptocurrency</p>
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Donation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Selector */}
            <div className="space-y-2">
              <Label htmlFor="wallet" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Select Wallet
              </Label>
              {walletsLoading ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                  <span className="text-sm text-gray-600">Loading wallets...</span>
                </div>
              ) : wallets.length === 0 ? (
                <div className="p-3 border border-red-200 rounded-md bg-red-50">
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    No wallets found. Please create a wallet first.
                  </p>
                </div>
              ) : (
                <Select value={selectedWalletId} onValueChange={setSelectedWalletId}>
                  <SelectTrigger className={`transition-all ${errors.wallet ? 'border-red-500 focus:border-red-500' : 'focus:border-blue-500'}`}>
                    <SelectValue placeholder="Choose a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.wallets.map((wallet) => (
                      <SelectItem key={wallet.id} value={wallet.id}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex flex-col">
                            {/* <span className="font-medium">{wallet.name || `Wallet ${wallet.id.slice(0, 8)}`}</span> */}
                            <span className="text-xs text-gray-500">{formatAddress(wallet.address)}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.wallet && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.wallet}
                </p>
              )}
              {selectedWallet && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <Wallet className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-blue-800">
                      {/* {selectedWallet.name || `Wallet ${selectedWallet.id.slice(0, 8)}`} */}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 font-mono">
                    Address: {selectedWallet.address}
                  </p>
                  {selectedWallet.balance && (
                    <p className="text-xs text-blue-600 mt-1">
                      Balance: {Number(selectedWallet.balance).toFixed(6)} ETH
                    </p>
                  )}
                </div>
              )}
            </div>

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
              disabled={loading || !name.trim() || !amountIDR || !selectedWalletId || wallets.length === 0}
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
                                {`Wallet ${selectedWalletId}`} ({formatAddress(selectedWallet?.address)})
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-green-700 mb-1">Transaction Hash:</p>
                              <div className="bg-green-100 rounded-md p-2 border border-green-200">
                                <code className="text-xs text-green-800 font-mono break-all leading-relaxed">
                                  {result.txHash}
                                </code>
                              </div>
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
          <p>Secured by blockchain technology • Real-time rates by CoinGecko API</p>
        </div>
      </div>
    </div>
  );
}