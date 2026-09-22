"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import {
  currentPrice,
  formatEth,
  launchTokenAbi,
  marketCap,
  progressBps,
  tokenColors,
  type Launch,
} from "@/lib/launchpad";
import { TokenIcon } from "./token-icon";

type SortKey = "newest" | "progress" | "mcap" | "reserve";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "progress", label: "Progress" },
  { key: "mcap", label: "Market Cap" },
  { key: "reserve", label: "Reserve" },
];

export function MarketTable({ launches }: { launches: Launch[] }) {
  const [tab, setTab] = useState<"all" | "graduated">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    let list = [...launches];
    if (tab === "graduated") list = list.filter((l) => l.graduated);
    switch (sort) {
      case "progress":
        list.sort((a, b) => progressBps(b) - progressBps(a));
        break;
      case "mcap":
        list.sort((a, b) => (marketCap(b) > marketCap(a) ? 1 : marketCap(b) < marketCap(a) ? -1 : 0));
        break;
      case "reserve":
        list.sort((a, b) => (b.ethReserve > a.ethReserve ? 1 : b.ethReserve < a.ethReserve ? -1 : 0));
        break;
      default:
        list.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));
    }
    return list;
  }, [launches, tab, sort]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-panel/80 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-1 rounded-lg bg-black/30 p-1">
          {(
            [
              { key: "all", label: "All Token" },
              { key: "graduated", label: "Graduated" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                tab === t.key
                  ? "bg-primary text-[#0a0a0a]"
                  : "text-sage/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex flex-1 items-center">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="pointer-events-none absolute left-3 text-sage/50"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter token name or address to search"
            className="h-9 w-full rounded-lg border border-white/[0.07] bg-black/25 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center gap-1">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs transition ${
                sort === s.key
                  ? "font-bold text-primary"
                  : "text-sage/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="table-hairline border-b text-[11px] font-semibold tracking-wider text-sage/50">
              <th className="px-4 py-3 sm:px-5">COIN</th>
              <th className="px-3 py-3 text-right">PRICE</th>
              <th className="px-3 py-3 text-right">MCAP</th>
              <th className="hidden px-3 py-3 text-right md:table-cell">PROGRESS</th>
              <th className="hidden px-3 py-3 text-right sm:table-cell">RESERVE</th>
              <th className="px-3 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((launch) => (
              <MarketRow key={launch.id.toString()} launch={launch} query={query} />
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-sm text-sage/50 sm:px-5">
                  {launches.length === 0
                    ? "No tokens launched yet — create the first one."
                    : "No tokens match your search."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MarketRow({ launch, query }: { launch: Launch; query: string }) {
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

  const pct = Math.min(100, progressBps(launch));
  const [from, to] = tokenColors(launch.token);

  const q = query.trim().toLowerCase();
  const matches =
    !q ||
    (name ?? "").toLowerCase().includes(q) ||
    (symbol ?? "").toLowerCase().includes(q) ||
    launch.token.toLowerCase().includes(q);

  if (!matches) return null;

  return (
    <tr className="row-hover table-hairline border-b transition last:border-b-0">
      <td className="px-4 py-3 sm:px-5">
        <Link href={`/launch/${launch.id}`} className="group flex items-center gap-3">
          <TokenIcon address={launch.token} symbol={symbol} size="sm" />
          <div className="min-w-0">
            <p className="truncate font-bold text-white group-hover:text-primary">
              {name ?? "\u00A0"}
            </p>
            <p className="text-xs text-sage/50">
              {symbol ?? "\u2014"} · #{launch.id.toString()}
            </p>
          </div>
        </Link>
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm text-white">
        {formatEth(currentPrice(launch), 7)}
        <span className="ml-1 text-[10px] text-sage/50">ETH</span>
      </td>
      <td className="px-3 py-3 text-right font-mono text-sm text-white">
        {formatEth(marketCap(launch), 3)}
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <div className="ml-auto w-full max-w-[140px]">
          <div className="h-2 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${from}, ${to})`,
                boxShadow: `0 0 10px ${from}99`,
              }}
            />
          </div>
        </div>
      </td>
      <td className="hidden px-3 py-3 text-right font-mono text-sm text-sage/80 sm:table-cell">
        {formatEth(launch.ethReserve, 2)} ETH
      </td>
      <td className="px-3 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {launch.graduated && (
            <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary lg:inline">
              GRADUATED
            </span>
          )}
          <Link
            href={`/launch/${launch.id}`}
            className="rounded-lg border border-white/[0.08] bg-white/5 px-3.5 py-1.5 text-xs font-bold text-white transition hover:border-primary/50 hover:bg-primary hover:text-[#0a0a0a] hover:shadow-[0_0_16px_-4px_rgba(108,255,50,0.7)]"
          >
            Trade
          </Link>
        </div>
      </td>
    </tr>
  );
}