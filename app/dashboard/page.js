"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  Plus,
  History,
  Settings,
  User,
  Eye,
  EyeOff,
  Copy,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  DollarSign,
  Shield,
  ExternalLink,
  RefreshCw,
  Bell,
  Award,
  Heart,
  Coins,
  BarChart3,
  Download,
  Filter,
  Search,
  Edit2,
  Trash2,
  Star,
  X
} from "lucide-react";
import { id } from "ethers";
import { supabase } from "@/lib/supabase"; // Adjust the import based on your project structure

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [userId, setUserId] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [donations, setDonations] = useState([]);
  const [newWallet, setNewWallet] = useState({ privateKey: "" });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notifications, setNotifications] = useState([]);

  // Mock user data (would come from auth context in real app)
  const user = {
    name: "John Doe",
    email: "john@example.com",
    joinDate: new Date('2024-01-01'),
    totalDonations: donations.length,
    totalAmount: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
    rank: "Gold Donor"
  };

  useEffect(() => {
    // Fetch user ID first, then fetch wallets after userId is set
    const fetchAll = async () => {
      await getUserId();
      fetchDonations();
      fetchNotifications();
    };
    fetchAll();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchWallets();
    }
  }, [userId]);

  const getUserId = async () => {
    try {
      const res = await supabase.auth.getUser();
      if (res.error) throw new Error(res.error.message);
      setUserId(res.data.user.id);
    } catch (error) {
      console.error("Error fetching user ID:", error);
    }
  };

  const fetchWallets = async () => {
    try {
      const res = await fetch(`/api/wallet/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch wallets");
      const data = await res.json();
      setWallets(data);
    } catch (error) {
      setWallets([]);
    }
  };

  const fetchDonations = async () => {
    try {
      const res = await fetch("/api/donation");
      if (!res.ok) throw new Error("Failed to fetch donations");
      const data = await res.json();
      setDonations(data);
    } catch (error) {
      setDonations([]);
    }
  };

  const fetchNotifications = async () => {
    try {
      setNotifications([
        { id: 1, message: "New donation completed successfully", time: "2 hours ago", read: false },
        { id: 2, message: "Wallet balance updated", time: "1 day ago", read: true },
        { id: 3, message: "Monthly donation report available", time: "3 days ago", read: false }
      ]);
    } catch (error) {
      setNotifications([]);
    }
  };

  // Calculate statistics
  const stats = {
    totalDonated: donations.reduce((sum, d) => sum + (d.amount_idr || 0), 0),
    totalETH: donations.reduce((sum, d) => sum + (d.amount_eth || 0), 0),
    completedDonations: donations.filter(d => d.status === "success").length,
    pendingDonations: donations.filter(d => d.status === "pending").length
  };

  // Format currency
  const formatIDR = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Generate new wallet (only privateKey)
  const generateWallet = () => {
    const randomPrivateKey = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setNewWallet({
      privateKey: randomPrivateKey
    });
  };

  // Add wallet (only privateKey and userId)
  const addWallet = async () => {
    if (!newWallet.privateKey) {
      setMessage({ type: "error", text: "Private key is required" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ private_key: newWallet.privateKey, user_id: userId })
      });
      if (!res.ok) throw new Error("Failed to add wallet");
      await fetchWallets();
      setNewWallet({ privateKey: "" });
      setMessage({ type: "success", text: "Wallet added successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: "success", text: "Copied to clipboard!" });
  };

  // Filter donations - updated for backend property names
  const filteredDonations = donations.filter(donation => {
    const matchesSearch = (donation.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (donation.tx_hash || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || donation.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Add this function above the return statement in your component:
  const hideMessage = () => {
    setMessage(null);
  };
  // Overview Tab Component
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Donated</p>
                <p className="text-2xl font-bold">{formatIDR(stats.totalDonated)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">ETH Donated</p>
                <p className="text-2xl font-bold">{stats.totalETH.toFixed(4)}</p>
              </div>
              <Coins className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Completed</p>
                <p className="text-2xl font-bold">{stats.completedDonations}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Donor Rank</p>
                <p className="text-xl font-bold">{user.rank}</p>
              </div>
              <Award className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Donations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {donations.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No donations yet</p>
              ) : (
                donations.slice(0, 3).map(donation => (
                  <div key={donation.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${donation.status === 'success' ? 'bg-green-500' : 'bg-orange-500'}`} />
                      <div>
                        <p className="font-medium text-sm">{donation.name || 'Unknown Recipient'}</p>
                        <p className="text-xs text-gray-500">{donation.created_at ? new Date(donation.created_at).toLocaleDateString() : 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatIDR(donation.amount_idr || 0)}</p>
                      <p className="text-xs text-gray-500">{(donation.amount_eth || 0).toFixed(6)} ETH</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No notifications</p>
              ) : (
                notifications.slice(0, 4).map(notification => (
                  <div key={notification.id} className={`p-3 border rounded-lg ${!notification.read ? 'bg-blue-50 border-blue-200' : ''}`}>
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // Wallets Tab Component
  const WalletsTab = () => (
    <div className="space-y-6">
      {/* Create New Wallet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="privateKey">Private Key (Keep this secure!)</Label>
            <div className="flex gap-2">
              <Input
                id="privateKey"
                type={showPrivateKey ? "text" : "password"}
                value={newWallet.privateKey}
                onChange={(e) => setNewWallet({ privateKey: e.target.value })}
                placeholder="Private Key"
              />
              <Button
                variant="outline"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
              >
                {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                onClick={generateWallet}
              >
                Generate
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(newWallet.privateKey)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Button onClick={addWallet} disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Wallet"}
          </Button>
        </CardContent>
      </Card>

      {/* Existing Wallets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            My Wallets ({wallets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {wallets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No wallets found. Add your first wallet above.</p>
            ) : (
              wallets.wallets.map(wallet => (
                <div key={wallet.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{wallet.name || "Wallet"}</h3>
                        {wallet.is_default && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Address:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {wallet.address}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(wallet.address)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm">
                            <strong>Balance:</strong> {wallet.balance || 0} ETH
                          </span>
                          <span className="text-sm text-gray-500">
                            Created: {wallet.created_at ? new Date(wallet.created_at).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // History Tab Component
  const HistoryTab = () => (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by recipient or transaction hash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donation History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Donation History ({filteredDonations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDonations.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                {donations.length === 0 ? "No donations yet" : "No donations match your search criteria"}
              </p>
            ) : (
              filteredDonations.map(donation => (
                <div key={donation.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-3 h-3 rounded-full mt-2 ${donation.status === 'success' ? 'bg-green-500' :
                        donation.status === 'pending' ? 'bg-orange-500' : 'bg-red-500'
                        }`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{donation.name || 'Unknown Recipient'}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${donation.status === 'success' ? 'bg-green-100 text-green-700' :
                            donation.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                            {donation.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            Date: {donation.created_at ? new Date(donation.created_at).toLocaleDateString() : 'N/A'}
                            {donation.created_at && ` at ${new Date(donation.created_at).toLocaleTimeString()}`}
                          </p>
                          {donation.tx_hash && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500">Tx Hash:</span>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                {donation.tx_hash.substring(0, 20)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(donation.tx_hash)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatIDR(donation.amount_idr || 0)}</p>
                      <p className="text-sm text-gray-500">{(donation.amount_eth || 0).toFixed(6)} ETH</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Settings Tab Component
  const SettingsTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" defaultValue={user.name} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue={user.email} />
            </div>
          </div>
          <Button>Update Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h3 className="font-medium">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-500">Add an extra layer of security</p>
            </div>
            <Button variant="outline">Enable</Button>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <h3 className="font-medium">Email Notifications</h3>
              <p className="text-sm text-gray-500">Get notified about donations</p>
            </div>
            <Button variant="outline">Configure</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {user.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Welcome back, {user.name}</h1>
                <p className="text-sm text-gray-600">Manage your donations and wallets</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "wallets", label: "Wallets", icon: Wallet },
              { id: "history", label: "History", icon: History },
              { id: "settings", label: "Settings", icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "wallets" && <WalletsTab />}
        {activeTab === "history" && <HistoryTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>

      {/* Message Display */}
      {message && (
        <>
          <div className="fixed top-4 left-4 right-4 z-50 flex justify-center">
            <Alert
              className={`shadow-lg transition-all duration-300 w-full max-w-2xl flex items-center justify-between ${message.type === "success"
                ? "border-green-500 bg-green-50"
                : "border-red-500 bg-red-50"
                }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {message.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                )}
                <AlertDescription
                  className={`text-sm text-ellipsis overflow-hidden whitespace-nowrap min-w-0 ${message.type === "success" ? "text-green-800" : "text-red-800"
                    }`}
                >
                  {message.text}
                </AlertDescription>
              </div>

              <button
                onClick={hideMessage}
                className={`ml-4 hover:bg-opacity-20 rounded-full p-1.5 transition-colors flex-shrink-0 ${message.type === "success" ? "hover:bg-green-600" : "hover:bg-red-600"
                  }`}
              >
                <X
                  className={`w-4 h-4 ${message.type === "success" ? "text-green-600" : "text-red-600"
                    }`}
                />
              </button>
            </Alert>
          </div>
        </>
      )}
    </div>
  );
}