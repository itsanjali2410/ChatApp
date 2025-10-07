
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
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}

        {/* Login Form */}
        <div className="bg-[var(--secondary)] rounded-xl border border-[var(--border)] p-8 shadow-lg">
          {error && (
            <div className="mb-4 p-3 bg-[var(--error-light)] border border-[var(--error)] rounded-lg text-sm text-[var(--error)]">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
        
              </label>
              <input
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">

              </label>
              <input
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-colors bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
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
