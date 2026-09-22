"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useReadContract } from "wagmi";
import { Header } from "@/components/header";
import { MarketTable } from "@/components/market-table";
import { SetupNotice } from "@/components/setup-notice";
import { TokenIcon } from "@/components/token-icon";
import {
  LAUNCHPAD_ADDRESS,
  formatEth,
  isLaunchpadConfigured,
  launchpadAbi,
  launchTokenAbi,
  marketCap,
  progressBps,
  toLaunchFromStruct,
  type Launch,
} from "@/lib/launchpad";
import { ensureTokenCreatedAt, formatTimeAgo, useNow, useTokenCreatedAt } from "@/lib/created-at";

type LaunchStruct = Omit<Launch, "id">;

const HOW_IT_WORKS = [
  "Click [Create Token]",
  "Choose a name, symbol (ticker) and token parameters",
  "Token is now created and tradable on the bonding curve",
  "Once the bonding curve reaches 100%, trading graduates",
  "Everyone buys and sells on the curve — the same price for all",
];

export default function Home() {
  const { data, isLoading } = useReadContract({
    address: LAUNCHPAD_ADDRESS,
    abi: launchpadAbi,
    functionName: "getAllLaunches",
    query: { enabled: isLaunchpadConfigured },
  });

  const launches: Launch[] = useMemo(
    () =>
      (data as unknown as LaunchStruct[] | undefined)?.map((item, index) =>
        toLaunchFromStruct(index, item),
      ) ?? [],
    [data],
  );

  const sorted = [...launches].sort((a, b) =>
    marketCap(b) > marketCap(a) ? 1 : marketCap(b) < marketCap(a) ? -1 : 0,
  );

  useEffect(() => {
    for (const launch of launches) {
      ensureTokenCreatedAt(launch.id);
    }
  }, [launches]);

  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="w-full flex-1 px-4 py-10 sm:px-6 lg:px-10">
        {!isLaunchpadConfigured && (
          <div className="mb-8 animate-float-in">
            <SetupNotice />
          </div>
        )}

        <section className="animate-float-in grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="max-w-md text-2xl font-black leading-tight text-white sm:text-3xl">
              The First Meme Fair Launch Platform on Sepolia.
              <span className="text-primary"> PUMP TO THE LAUNCHPAD.</span>
            </p>

            <div className="mt-6 flex flex-col items-start gap-2">
              <Link
                href="/create"
                className="button-shine group relative inline-flex h-14 items-center gap-3 rounded-2xl bg-[#6CFF32] px-8 text-lg font-black text-[#0a0a0a] shadow-[0_18px_40px_-14px_rgba(108,255,50,0.8)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_24px_52px_-12px_rgba(108,255,50,0.95)]"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#0a0a0a] text-[#6CFF32] transition duration-300 group-hover:scale-110 group-hover:rotate-6">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
                    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                  </svg>
                </span>
                Create Token
                <svg
                  className="transition duration-300 group-hover:translate-x-1"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
              <p className="text-sm text-sage/50">
                No listing fee · your token is tradable the moment it launches
              </p>
            </div>

            <details className="group mt-4">
              <summary className="cursor-pointer list-none text-sm font-bold text-primary underline decoration-primary/40 underline-offset-4 transition hover:decoration-primary">
                How it works?
              </summary>
              <ol className="mt-4 space-y-2 rounded-2xl border border-white/[0.07] bg-panel/80 p-5 text-sm text-zinc-300">
                {HOW_IT_WORKS.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-[11px] font-bold text-primary">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </details>
          </div>

          {isLoading && isLaunchpadConfigured ? (
            <div className="h-64 animate-pulse rounded-[14px] border border-white/[0.06] bg-panel/80" />
          ) : (
            <HighProgressPanel launches={launches} />
          )}
        </section>

        <section className="mt-14">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">Leaderboard</h2>
              <span className="mt-0.5 block text-sm text-sage/50">
                {sorted.length} token{sorted.length === 1 ? "" : "s"} on the curve
              </span>
            </div>
            <Link
              href="/create"
              className="button-shine inline-flex h-11 items-center gap-2 rounded-xl bg-[#6CFF32] px-5 text-sm font-extrabold text-[#0a0a0a] shadow-[0_12px_30px_-10px_rgba(108,255,50,0.6)] transition duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              Create Token
            </Link>
          </div>
          {sorted.length === 0 ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <LeaderSkeleton />
              <LeaderSkeleton />
              <LeaderSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((launch, i) => (
                <LeaderCard key={launch.id.toString()} launch={launch} rank={i + 1} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-14 min-h-[370px]">
          {isLoading && isLaunchpadConfigured ? (
            <div className="h-72 animate-pulse rounded-2xl border border-white/[0.06] bg-panel/80" />
          ) : (
            <MarketTable launches={launches} />
          )}
        </section>
      </main>
    </div>
  );
}

const MAX_PANEL_ROWS = 5;

function HighProgressPanel({ launches }: { launches: Launch[] }) {
  const top = [...launches]
    .sort((a, b) => progressBps(b) - progressBps(a))
    .slice(0, MAX_PANEL_ROWS);

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-panel/80 p-5 backdrop-blur">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(420px circle at 110% -20%, rgba(108,255,50,0.12), transparent 60%)",
        }}
      />
      <div className="relative mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6CFF32"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2v6l4 4 3-1a9 9 0 1 1-7-9Z" />
          </svg>
          <h2 className="text-sm font-extrabold text-white">High Progress</h2>
        </div>
        <span className="text-[11px] text-sage/50">near graduation</span>
      </div>

      {top.length === 0 ? (
        <div className="relative py-8 text-center text-sm text-sage/50">
          No tokens on the curve yet.
        </div>
      ) : (
        <ul className="relative divide-y divide-white/[0.05]">
          {top.map((launch) => (
            <ProgressRow key={launch.id.toString()} launch={launch} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProgressRow({ launch }: { launch: Launch }) {
  const pct = Math.min(100, progressBps(launch));
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

  return (
    <li>
      <Link
        href={`/launch/${launch.id}`}
        className="group flex items-center gap-3 py-2.5 transition hover:bg-white/[0.03]"
      >
        <TokenIcon address={launch.token} symbol={symbol} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-bold text-white group-hover:text-primary">
              {name ?? "\u00A0"}
            </p>
            <span className="shrink-0 font-mono text-xs font-bold text-primary">
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-primary/80 shadow-[0_0_8px_rgba(108,255,50,0.6)]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </Link>
    </li>
  );
}

function LeaderCard({ launch, rank }: { launch: Launch; rank: number }) {
  const pct = Math.min(100, progressBps(launch));
  const createdAt = useTokenCreatedAt(launch.id);
  const now = useNow();
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
  return (
    <Link
      href={`/launch/${launch.id}`}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-[14px] border border-white/[0.06] bg-panel/80 p-4 backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_18px_44px_-20px_rgba(0,0,0,0.9)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 transition duration-500 group-hover:opacity-100"
        style={{
          background: "radial-gradient(360px circle at 110% -30%, rgba(108,255,50,0.12), transparent 55%)",
        }}
      />
      <div className="relative flex items-center gap-3">
        <TokenIcon address={launch.token} symbol={symbol} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-extrabold text-white group-hover:text-primary">
            {name ?? "\u00A0"}
            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
              {rank}
            </span>
          </p>
          <p className="mt-0.5 truncate text-sm text-sage/60">
            {symbol ?? "\u2014"} · #{launch.id.toString()}
          </p>
          <p className="mt-0.5 text-xs text-sage/40">Created {createdAt ? formatTimeAgo(createdAt, now) : "…"}</p>
        </div>
      </div>
      <div className="relative mt-auto">
        <div className="mb-1.5 flex items-center justify-between text-xs text-sage/50">
          <span>Progress</span>
          <span className="font-mono text-primary">{pct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-primary/80 shadow-[0_0_12px_rgba(108,255,50,0.6)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="relative grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-black/25 px-3 py-2">
          <p className="text-[11px] text-sage/50">Market cap</p>
          <p className="mt-0.5 truncate font-mono text-sm text-white">
            {formatEth(marketCap(launch), 2)} ETH
          </p>
        </div>
        <div className="rounded-lg bg-black/25 px-3 py-2">
          <p className="text-[11px] text-sage/50">Reserve</p>
          <p className="mt-0.5 truncate font-mono text-sm text-white">
            {formatEth(launch.ethReserve, 2)} ETH
          </p>
        </div>
      </div>
    </Link>
  );
}

function LeaderSkeleton() {
  return (
    <div className="animate-pulse rounded-[14px] border border-white/[0.06] bg-panel/80 p-4">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-2/3 rounded bg-white/5" />
          <div className="h-3 w-1/3 rounded bg-white/5" />
        </div>
      </div>
      <div className="mt-4 h-2.5 rounded-full bg-white/5" />
    </div>
  );
}