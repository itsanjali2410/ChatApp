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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Create Organization</h1>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <button className="w-full mt-5 bg-blue-600 text-white py-2 rounded disabled:opacity-60" disabled={loading} onClick={create}>
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}


