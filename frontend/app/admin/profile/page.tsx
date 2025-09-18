"use client";
import React, { useState } from "react";

export default function AdminProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string>(typeof window !== "undefined" ? localStorage.getItem("email") || "" : "");

  const save = async () => {
    alert("Profile saved (stub)");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="space-y-3 max-w-md">
        <input className="w-full border rounded px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={save}>Save</button>
      </div>
    </div>
  );
}


