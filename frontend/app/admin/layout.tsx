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
    <div className="h-screen grid grid-cols-12 bg-[#0D0D0D]">
      <aside className="col-span-3 border-r border-[#D4AF37] p-4 space-y-3 bg-[#121212]">
        <h2 className="text-xl font-bold text-[#EAEAEA]">Admin</h2>
        <nav className="flex flex-col gap-2">
          <a className="text-[#D4AF37] hover:text-[#FFD700] transition-colors" href="/admin/org">Organization</a>
          <a className="text-[#D4AF37] hover:text-[#FFD700] transition-colors" href="/admin/profile">Profile</a>
          <a className="text-[#D4AF37] hover:text-[#FFD700] transition-colors" href="/admin/chat">Chat</a>
        </nav>
        <button className="mt-4 px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#FFD700] text-[#0D0D0D] rounded hover:from-[#FFD700] hover:to-[#FFA500] transition-all duration-200 shadow-lg" onClick={logout}>Logout</button>
      </aside>
      <main className="col-span-9 bg-[#0D0D0D]">{children}</main>
    </div>
  );
}
