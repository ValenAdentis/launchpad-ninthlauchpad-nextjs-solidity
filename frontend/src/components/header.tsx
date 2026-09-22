"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-black/55 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6 lg:px-10">
        <Link href="/" className="group flex items-center gap-2.5">
          <span
            className="relative grid h-9 w-9 place-items-center rounded-lg text-sm font-black text-[#0a0a0a] transition-transform duration-300 group-hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #6CFF32, #a3f27a)",
              boxShadow: "0 0 18px -4px rgba(108,255,50,0.7)",
            }}
          >
            L
          </span>
          <span className="text-lg font-extrabold tracking-tight text-white">
            LaunchPad<span className="text-primary">Simple</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/"
            className={`rounded-lg px-3.5 py-2 text-sm transition ${
              pathname === "/"
                ? "bg-white/5 font-bold text-primary"
                : "text-sage/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Explore
          </Link>
          <Link
            href="/create"
            className={`rounded-lg px-3.5 py-2 text-sm transition ${
              pathname === "/create"
                ? "bg-white/5 font-bold text-primary"
                : "text-sage/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            Launchpad
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/create"
            className="button-shine relative inline-flex h-10 items-center gap-2 rounded-full bg-[#6CFF32] px-6 text-sm font-extrabold text-[#0a0a0a] shadow-[0_10px_26px_-10px_rgba(108,255,50,0.75)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Create Token
          </Link>
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}