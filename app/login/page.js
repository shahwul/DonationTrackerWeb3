"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  Github,
  Chrome
} from "lucide-react";
import { supabase } from '@/lib/supabase'

export default function AuthPages() {
  const [currentPage, setCurrentPage] = useState("login"); // "login", "register", "dashboard"
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [user, setUser] = useState(null);

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validate password strength
  const isStrongPassword = (password) => {
    return password.length >= 8 && 
           /[A-Z]/.test(password) && 
           /[a-z]/.test(password) && 
           /[0-9]/.test(password);
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (currentPage === "register" && !isStrongPassword(formData.password)) {
      newErrors.password = "Password must be at least 8 characters with uppercase, lowercase, and numbers";
    }

    if (currentPage === "register") {
      if (!formData.fullName.trim()) {
        newErrors.fullName = "Full name is required";
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    setMessage(null);
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setUser(data.user);
        setCurrentPage("dashboard");
        setMessage({ type: "success", text: "Welcome back! Login successful." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        setMessage({ 
          type: "success", 
          text: "Registration successful! Please check your email for verification." 
        });
        // Clear form
        setFormData({ email: "", password: "", confirmPassword: "", fullName: "" });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setLoading(false);
    }
  };

  // Handle OAuth login
  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider
      });

      if (error) {
        setMessage({ type: "error", text: error.message });
      } else {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      setMessage({ type: "error", text: "OAuth login failed" });
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setCurrentPage("login");
      setFormData({ email: "", password: "", confirmPassword: "", fullName: "" });
      setMessage({ type: "success", text: "Logged out successfully" });
    } finally {
      setLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      if (currentPage === "login") {
        handleLogin();
      } else if (currentPage === "register") {
        handleRegister();
      }
    }
  };

  // Dashboard Component
  const Dashboard = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full text-white mx-auto mb-4">
              <CheckCircle className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Welcome, {user?.user_metadata?.full_name || user?.email}!
            </CardTitle>
            <p className="text-gray-600">You are successfully logged in</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">Account Information</h3>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>User ID:</strong> {user?.id}</p>
                <p><strong>Account Created:</strong> {new Date().toLocaleDateString()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="w-full">
                Edit Profile
              </Button>
              <Button variant="outline" className="w-full">
                Account Settings
              </Button>
            </div>
            
            <Button 
              onClick={handleLogout}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Logout"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  // If user is logged in, show dashboard
  if (currentPage === "dashboard" && user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto pt-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white mb-4">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentPage === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-gray-600">
            {currentPage === "login" 
              ? "Sign in to your account" 
              : "Join us today and get started"
            }
          </p>
        </div>

        {/* Auth Form Card */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-800">
              {currentPage === "login" ? "Login" : "Register"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Full Name - Register only */}
            {currentPage === "register" && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input 
                  id="fullName" 
                  value={formData.fullName} 
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your full name" 
                  className={`transition-all ${errors.fullName ? 'border-red-500' : 'focus:border-blue-500'}`}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.fullName}
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input 
                id="email" 
                type="email"
                value={formData.email} 
                onChange={(e) => handleInputChange("email", e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your email" 
                className={`transition-all ${errors.email ? 'border-red-500' : 'focus:border-blue-500'}`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"}
                  value={formData.password} 
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your password" 
                  className={`pr-10 transition-all ${errors.password ? 'border-red-500' : 'focus:border-blue-500'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password - Register only */}
            {currentPage === "register" && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword} 
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Confirm your password" 
                    className={`pr-10 transition-all ${errors.confirmPassword ? 'border-red-500' : 'focus:border-blue-500'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Demo Credentials for Login */}
            {currentPage === "login" && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs font-medium text-blue-800 mb-1">Demo Credentials:</p>
                <p className="text-xs text-blue-700">Email: admin@test.com</p>
                <p className="text-xs text-blue-700">Password: password123</p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              onClick={currentPage === "login" ? handleLogin : handleRegister}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-2.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentPage === "login" ? "Signing in..." : "Creating account..."}
                </>
              ) : (
                <>
                  {currentPage === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {/* OAuth Buttons */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">Or continue with</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin('github')}
                  disabled={loading}
                  className="w-full"
                >
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleOAuthLogin('google')}
                  disabled={loading}
                  className="w-full"
                >
                  <Chrome className="w-4 h-4 mr-2" />
                  Google
                </Button>
              </div>
            </div>

            {/* Switch between Login/Register */}
            <div className="text-center pt-4">
              <p className="text-sm text-gray-600">
                {currentPage === "login" 
                  ? "Don't have an account? " 
                  : "Already have an account? "
                }
                <button
                  onClick={() => {
                    setCurrentPage(currentPage === "login" ? "register" : "login");
                    setMessage(null);
                    setErrors({});
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {currentPage === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Message Display */}
        {message && (
          <Alert className={`shadow-lg ${message.type === "success" ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}>
            <div className="flex items-start gap-3">
              {message.type === "success" ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <AlertDescription className={`text-sm ${message.type === "success" ? "text-green-800" : "text-red-800"}`}>
                {message.text}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pb-8">
          <p>Secured by Supabase Authentication • Your data is protected</p>
        </div>
      </div>
    </div>
  );
}