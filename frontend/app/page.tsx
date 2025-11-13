// app/page.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      // If logged in, redirect to appropriate dashboard
      const role = localStorage.getItem('role');
      const orgId = localStorage.getItem('org_id');
      
      if (orgId) {
        router.push('/chat');
      } else {
        router.push('/organization/create');
      }
    } else {
      // If not logged in, redirect to login
      router.push('/login');
    }
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)] mx-auto mb-4"></div>
        <p className="text-[var(--text-secondary)]">Redirecting...</p>
      </div>
    </div>
  );
}
