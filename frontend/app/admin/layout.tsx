// app/admin/layout.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "../../utils/api";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const logout = async () => {
    try {
      await (await import("../../utils/api")).default.post("/auth/logout");
    } catch {}
    localStorage.clear();
    window.location.href = "/login";
  };
  return (
    <div className="h-screen grid grid-cols-12">
      <aside className="col-span-3 border-r p-4 space-y-3">
        <h2 className="text-xl font-bold">Admin</h2>
        <nav className="flex flex-col gap-2">
          <a className="text-blue-600" href="/admin/org">Organization</a>
          <a className="text-blue-600" href="/admin/profile">Profile</a>
          <a className="text-blue-600" href="/admin/chat">Chat</a>
        </nav>
        <button className="mt-4 px-4 py-2 bg-gray-200 rounded" onClick={logout}>Logout</button>
      </aside>
      <main className="col-span-9">{children}</main>
    </div>
  );
}
