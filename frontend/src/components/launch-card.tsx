"use client";

import Link from "next/link";
import { useReadContract } from "wagmi";
import {
  currentPrice,
  formatEth,
  formatTokenAmount,
  launchTokenAbi,
  progressBps,
  tokenColors,
  type Launch,
} from "@/lib/launchpad";
import { TokenIcon } from "./token-icon";

export function LaunchCard({ launch, delay = 0 }: { launch: Launch; delay?: number }) {
  const { data: name } = useReadContract({
    address: launch.token,
    abi: launchTokenAbi,
    functionName: "name",
  });
  const { data: symbol } = useReadContract({
    address: launch.token,
    abi: launchTokenAbi,
    functionName: "symbol",
  });

  const [from, to] = tokenColors(launch.token);
  const pct = Math.min(100, progressBps(launch));
  const price = currentPrice(launch);

  return (
    <Link
      href={`/launch/${launch.id}`}
      className="group relative flex animate-pop-in flex-col gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.05] hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(560px circle at 18% -12%, ${from}26, transparent 55%)`,
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <TokenIcon address={launch.token} symbol={symbol} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{name ?? "\u00A0"}</p>
            <p className="text-xs text-zinc-500">
              #{launch.id.toString()} · {symbol ?? "\u2014"}
            </p>
          </div>
        </div>
        {launch.graduated ? (
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-emerald-300">
            GRADUATED
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300">
            Live
          </span>
        )}
      </div>

      <div className="relative grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-black/20 px-3 py-2.5">
          <p className="text-xs text-zinc-500">Price</p>
          <p className="mt-0.5 truncate font-mono text-sm text-white">
            {formatEth(price, 7)} ETH
          </p>
        </div>
        <div className="rounded-xl bg-black/20 px-3 py-2.5">
          <p className="text-xs text-zinc-500">Reserve</p>
          <p className="mt-0.5 truncate font-mono text-sm text-white">
            {formatEth(launch.ethReserve, 3)} ETH
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
          <span>Bonding curve</span>
          <span className="font-mono text-zinc-400">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${from}, ${to})`,
              boxShadow: `0 0 14px ${from}aa`,
            }}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {formatTokenAmount(launch.tokensSold)} / {formatTokenAmount(launch.totalSupply)} sold
        </p>
      </div>

      <div className="relative mt-auto flex items-center gap-1.5 text-sm font-medium text-indigo-300 transition-all duration-300 group-hover:gap-2.5 group-hover:text-indigo-200">
        Open trading view
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}