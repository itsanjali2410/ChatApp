
"use client";
import { useRouter } from "next/navigation";
import React, { use, useState, useEffect } from "react";
import api from "../../utils/api";

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if already logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Check if token is valid by trying to decode it
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // If token is not expired, redirect to chat
        if (payload.exp && payload.exp > currentTime) {
          const orgId = localStorage.getItem('org_id');
          const target = orgId ? "/chat" : "/organization/create";
          router.push(target);
        }
      } catch (error) {
        // Token is invalid, clear it
        localStorage.clear();
      }
    }
  }, [router]);

  const handleLogin = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required");
      return;
    }

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

      const target = org_id ? "/chat" : "/organization/create";
      router.push(target);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || "Login failed";
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && email.trim() && password.trim()) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--accent)] rounded-xl shadow-lg mb-4">
            <svg className="w-8 h-8 text-[var(--text-inverse)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
            Welcome to ChatApp
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            Sign in to your account to continue
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-[var(--secondary)] rounded-xl border border-[var(--border)] p-8 shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-[var(--error-light)] border border-[var(--error)] rounded-lg text-sm text-[var(--error)]">
              {error}
            </div>
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
        
              </label>
              <input
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="email"
              />
            </div>
            
            <div>
              
              <div className="relative">
                <input
                  className="w-full px-4 py-3 pr-12 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-6 bg-[var(--accent)] text-[var(--text-inverse)] py-3 rounded-lg font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--text-inverse)] mr-2"></div>
                  Signing in...
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[var(--text-secondary)]">
              New here?{" "}
              <a 
                className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors" 
                href="/signup"
              >
                Create an account
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-[var(--text-muted)]">
          <p>© 2024 ChatApp. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
