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
    <div className="h-screen grid grid-cols-12 bg-[var(--background)]">
      <aside className="col-span-3 border-r border-[var(--border)] p-4 space-y-3 bg-[var(--secondary)] shadow-lg">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Admin</h2>
        <nav className="flex flex-col gap-2">
          <a className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--secondary-hover)]" href="/admin/org">Organization</a>
          <a className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--secondary-hover)]" href="/admin/profile">Profile</a>
          <a className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors px-3 py-2 rounded-lg hover:bg-[var(--secondary-hover)]" href="/admin/chat">Chat</a>
        </nav>
        <button className="mt-4 px-4 py-2 bg-[var(--accent)] text-[var(--text-inverse)] rounded-lg hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-sm" onClick={logout}>Logout</button>
      </aside>
      <main className="col-span-9 bg-[var(--background)]">{children}</main>
    </div>
  );
}
