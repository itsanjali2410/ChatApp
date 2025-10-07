"use client";
import React, { Suspense } from "react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "../../utils/api";

function SignupForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    } catch (e) {
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
        } as any);
      } else {
        await api.post("/users/create_user", {
          username,
          email,
          password,
        });
      }
      setSuccess(needOrgSetup ? "Organization created. Redirecting to login..." : "Signup successful. Redirecting to login...");
      setTimeout(() => router.push("/login"), 800);
    } catch (e: any) {
      const detail = e?.response?.data?.detail || "Signup failed";
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
          <div className="flex gap-2 mb-6">
            <button
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "normal" 
                  ? "bg-[var(--accent)] text-[var(--text-inverse)]" 
                  : "bg-[#ffffff] text-[var(--text-secondary)] hover:bg-[#3b82f6]"
              }`}
              onClick={() => setMode("normal")}
            >
              Normal signup
            </button>
            <button
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "invite" 
                  ? "bg-[var(--accent)] text-[var(--text-inverse)]" 
                  : "bg-[#ffffff] text-[var(--text-secondary)] hover:bg-[#3b82f6]"
              }`}
              onClick={() => setMode("invite")}
            >
              Invite signup
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-500 rounded-lg text-sm text-green-400">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              </label>
              <input
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] transition-colors bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                
              </label>
              <input
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] transition-colors bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  checkEmail(e.target.value);
                }}
              />
              {checkingEmail && (
                <p className="text-sm text-[var(--accent)] mt-1">Checking email...</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
              </label>
              <input
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] transition-colors bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                type="password"
                placeholder="Create a password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {needOrgSetup && (
              <div className="mt-6 p-4 bg-[#ffffff] border border-[var(--border)] rounded-lg">
                <div className="flex items-center mb-3">
                  <span className="text-[var(--accent)] mr-2">ℹ️</span>
                  <h3 className="font-medium text-[var(--text-primary)]">Create Your Organization</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  We don't recognize this email. Create your organization to continue.
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
              <div className="mt-6 p-4 bg-[#ffffff] border border-[var(--border)] rounded-lg">
                <div className="flex items-center mb-3">
                  <h3 className="font-medium text-[var(--text-primary)]">Join with Invite</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Organization ID
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                      type="text"
                      placeholder="Enter organization ID"
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      Invite Token
                    </label>
                    <input
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--border)] bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
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
            className="w-full mt-6 bg-[var(--accent)] text-[var(--text-inverse)] py-3 rounded-lg font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            onClick={handleSignup}
            disabled={loading || checkingEmail}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--text-inverse)] mr-2"></div>
                {needOrgSetup ? "Creating organization..." : "Signing up..."}
              </div>
            ) : (
              needOrgSetup ? "Create Organization & Continue" : "Sign Up"
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


