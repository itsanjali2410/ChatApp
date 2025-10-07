
"use client";
import { useRouter } from "next/navigation";
import React, { use, useState } from "react";
import api from "../../utils/api";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, role, org_id, user_id } = res.data;
      localStorage.setItem("token", access_token);
      localStorage.setItem("role", role);
      if (org_id) localStorage.setItem("org_id", org_id);
      localStorage.setItem("email", email);
      if (user_id) localStorage.setItem("user_id", user_id);

      const target = role === "admin" ? "/admin/org" : (org_id ? "/dashboard" : "/organization/create");
      router.push(target);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Login failed";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#FFD700] rounded-full mb-4 shadow-lg">
            <span className="text-2xl text-[#0D0D0D]">💬</span>
          </div>
          <h1 className="text-3xl font-bold text-[#EAEAEA] mb-2">Welcome back</h1>
          <p className="text-[#C0C0C0]">Sign in to your ChatApp account</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#121212] rounded-xl border border-[#D4AF37] p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#EAEAEA] mb-1">
                Email Address
              </label>
              <input
                className="w-full px-4 py-3 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-colors bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[#EAEAEA] mb-1">
                Password
              </label>
              <input
                className="w-full px-4 py-3 border border-[#D4AF37] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-colors bg-[#0D0D0D] text-[#EAEAEA] placeholder-[#C0C0C0]"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            className="w-full mt-6 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] py-3 rounded-lg font-medium hover:from-[#FFD700] hover:to-[#FFA500] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0D0D0D] mr-2"></div>
                Signing in...
              </div>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-[#C0C0C0]">
              New here?{" "}
              <a 
                className="text-[#D4AF37] hover:text-[#FFD700] font-medium transition-colors" 
                href="/signup"
              >
                Create an account
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-[#C0C0C0]">
          <p>© 2024 ChatApp. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
