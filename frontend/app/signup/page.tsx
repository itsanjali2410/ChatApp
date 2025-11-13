"use client";
import React, { Suspense } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../utils/api";

type ApiErrorResponse = {
  response?: {
    data?: {
      detail?: string;
    };
  };
};

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const maybeError = error as ApiErrorResponse;
    const detail = maybeError.response?.data?.detail;
    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }
  }
  return fallback;
};

function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [token, setToken] = useState("");
  const [mode, setMode] = useState<"normal" | "invite">("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [needOrgSetup, setNeedOrgSetup] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgDescription, setOrgDescription] = useState<string>("");
  const [orgAddress, setOrgAddress] = useState<string>("");
  const [orgWebsite, setOrgWebsite] = useState<string>("");

  // Initialize from query params if present
  React.useEffect(() => {
    const qOrg = search.get("org") || "";
    const qToken = search.get("token") || "";
    if (qOrg || qToken) setMode("invite");
    if (qOrg) setOrgId(qOrg);
    if (qToken) setToken(qToken);
  }, [search]);

  // Check email existence and whether org setup is needed
  const checkEmail = async (value: string) => {
    const emailVal = value.trim();
    if (!emailVal || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailVal)) {
      setNeedOrgSetup(false);
      return;
    }
    try {
      setCheckingEmail(true);
      const res = await api.get("/auth/check_email", { params: { email: emailVal } });
      const data = res.data || {};
      // If not exists -> need org setup
      setNeedOrgSetup(!data.exists);
    } catch {
      // fail-closed to no org setup prompt
      setNeedOrgSetup(false);
    } finally {
      setCheckingEmail(false);
    }
  };

  const validate = () => {
    setError(null);
    if (!username.trim()) return "Username is required";
    if (!email.trim()) return "Email is required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (needOrgSetup) {
      if (!orgName.trim()) return "Organization name is required";
    }
    if (mode === "invite") {
      if (!orgId.trim()) return "Organization ID is required for invite signup";
      if (!token.trim()) return "Invite token is required for invite signup";
    }
    return null;
  };

  const handleSignup = async () => {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      if (needOrgSetup) {
        await api.post("/auth/register_admin_with_org", {
          username,
          email,
          password,
          org_name: orgName,
          description: orgDescription || undefined,
          address: orgAddress || undefined,
          website: orgWebsite || undefined,
        });
      } else if (mode === "invite") {
        await api.post("/users/signup_with_invite", {
          username,
          email,
          password,
          organization_id: orgId,
          token,
        });
      } else {
        await api.post("/users/create_user", {
          username,
          email,
          password,
        });
      }
      setSuccess(needOrgSetup ? "Organization created. Redirecting to login..." : "Signup successful. Redirecting to login...");
      setTimeout(() => router.push("/login"), 800);
    } catch (error: unknown) {
      const detail = getApiErrorMessage(error, "Signup failed");
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        

        {/* Signup Form */}
        <div className="bg-[var(--secondary)] rounded-xl border border-[var(--border)] p-8 shadow-lg">

          {/* Mode Selection */}
          <div className="flex gap-2 mb-6 p-1 bg-[var(--secondary-hover)] rounded-xl">
            <button
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "normal" 
                  ? "bg-[var(--accent)] text-[var(--text-inverse)] shadow-md" 
                  : "text-[var(--text-secondary)] hover:text-[var(--accent)]"
              }`}
              onClick={() => setMode("normal")}
            >
              New Account
            </button>
            <button
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "invite" 
                  ? "bg-[var(--accent)] text-[var(--text-inverse)] shadow-md" 
                  : "text-[var(--text-secondary)] hover:text-[var(--accent)]"
              }`}
              onClick={() => setMode("invite")}
            >
              Join with Invite
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border-l-4 border-red-500 rounded-lg text-sm text-red-400 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border-l-4 border-green-500 rounded-lg text-sm text-green-400 flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-200 bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm hover:shadow-md"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-200 bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm hover:shadow-md"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    checkEmail(e.target.value);
                  }}
                />
              </div>
              {checkingEmail && (
                <p className="text-xs text-[var(--accent)] mt-1.5 flex items-center">
                  <svg className="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Checking email...
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  className="w-full pl-10 pr-12 py-3 border border-[var(--border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all duration-200 bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm hover:shadow-md"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {needOrgSetup && (
              <div className="mt-6 p-4 bg-[#ffffff] border border-[var(--border)] rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-[var(--accent)] mr-2">ℹ️</span>
                  <h3 className="font-medium text-[var(--text-primary)]">Create Your Organization</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  We don&rsquo;t recognize this email. Create your organization to continue.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Organization Name *
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      type="text"
                      placeholder="Enter organization name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Description (optional)
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      type="text"
                      placeholder="Brief description of your organization"
                      value={orgDescription}
                      onChange={(e) => setOrgDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Address (optional)
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      type="text"
                      placeholder="Organization address"
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Website (optional)
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      type="text"
                      placeholder="https://your-website.com"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === "invite" && (
              <div className="mt-6 p-5 bg-gradient-to-br from-[var(--accent)]/5 to-[var(--accent)]/10 border-l-4 border-[var(--accent)] rounded-xl">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-[var(--accent)]/20 rounded-lg mr-3">
                    <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-[var(--text-primary)]">Join with Invite Code</h3>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mb-4 ml-12">
                  Enter the organization ID and invite token provided by your team
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Organization ID
                    </label>
                    <input
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm"
                      type="text"
                      placeholder="Enter organization ID"
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      Invite Token
                    </label>
                    <input
                      className="w-full px-4 py-2.5 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] transition-all bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] shadow-sm"
                      type="text"
                      placeholder="Enter invite token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            className="w-full mt-6 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] text-[var(--text-inverse)] py-3.5 rounded-xl font-semibold hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:scale-[1.02] transform"
            onClick={handleSignup}
            disabled={loading || checkingEmail}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--text-inverse)] mr-2"></div>
                {needOrgSetup ? "Creating organization..." : "Signing up..."}
              </div>
            ) : (
              <span className="flex items-center justify-center">
                {needOrgSetup ? "Create Organization & Continue" : "Create Account"}
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </button>

          <div className="mt-6 text-center">
            <p className="text-[var(--text-secondary)]">
              Already have an account?{" "}
              <a 
                className="text-[var(--accent)] hover:text-[var(--accent-hover)] font-medium transition-colors" 
                href="/login"
              >
                Log in
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-[var(--text-secondary)]">
          <p>© 2024 ChatApp. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-[var(--secondary-hover)] rounded-xl border border-[var(--border)] p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--border)] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}


