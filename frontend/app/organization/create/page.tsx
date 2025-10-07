"use client";
import React, { useState } from "react";
import api from "../../../utils/api";
import { useRouter } from "next/navigation";

export default function CreateOrganization() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const create = async () => {
    setError(null);
    setLoading(true);
    try {
      await api.post("/organization/create_org", { name, description, website });
      router.push("/admin/org");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md bg-[var(--secondary)] p-6 rounded-lg shadow-lg border border-[var(--border)]">
        <h1 className="text-2xl font-bold mb-4 text-[var(--text-primary)]">Create Organization</h1>
        {error && <div className="mb-3 text-sm text-[var(--error)]">{error}</div>}
        <div className="space-y-3">
          <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 bg-[var(--secondary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <button className="w-full mt-5 bg-[var(--accent)] text-[var(--text-inverse)] py-2 rounded-lg disabled:opacity-60 hover:bg-[var(--accent-hover)] transition-colors" disabled={loading} onClick={create}>
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}


