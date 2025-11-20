// app/page.tsx
"use client";

import Link from "next/link";

export default function HomePage() {
  const isAuthed =
    typeof window !== "undefined" && Boolean(localStorage.getItem("token"));

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white">
            Welcome to ChatApp
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Real-time messaging, ticketing, and mobile-ready collaboration for
            your teams.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <Link
            href="/chat"
            className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
          >
            Go to Chat
          </Link>
          <Link
            href="/tickets"
            className="px-6 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            View Tickets
          </Link>
        </div>

        {!isAuthed && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            New here?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">
              sign up
            </Link>{" "}
            to get started.
          </p>
        )}
      </div>
    </main>
  );
}
