"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  LAUNCHPAD_ADDRESS,
  currentPrice,
  formatBps,
  formatEth,
  formatTokenAmount,
  launchTokenAbi,
  launchpadAbi,
  marketCap,
  progressBps,
  shortAddress,
  tokenColors,
  type Launch,
} from "@/lib/launchpad";
import { TokenIcon } from "./token-icon";
import { TradePanel } from "./trade-panel";
import {
  ensureTokenCreatedAt,
  formatTimeAgo,
  useNow,
  useTokenCreatedAt,
} from "@/lib/created-at";

export function LaunchView({ launch }: { launch: Launch }) {
  const { address } = useAccount();
  const queryClient = useQueryClient();

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

  const { data: creatorFees, refetch: refetchFees } = useReadContract({
    address: LAUNCHPAD_ADDRESS,
    abi: launchpadAbi,
    functionName: "creatorFees",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess) return;
    void queryClient.invalidateQueries();
    void refetchFees();
  }, [isSuccess, queryClient, refetchFees]);

  const isCreator = !!address && launch.creator.toLowerCase() === address.toLowerCase();
  const pct = Math.min(100, progressBps(launch));
  const [from, to] = tokenColors(launch.token);
  const createdAt = useTokenCreatedAt(launch.id);
  const now = useNow();

  useEffect(() => {
    ensureTokenCreatedAt(launch.id);
  }, [launch.id]);

  return (
    <div className="animate-float-in grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-panel/80 p-6 backdrop-blur sm:p-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(640px circle at 20% -25%, ${from}22, transparent 55%)`,
            }}
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-5">
              <TokenIcon address={launch.token} symbol={symbol} size="lg" />
              <div>
                <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
                  {name ?? "Loading…"}
                </h1>
                <p className="mt-1 text-sm text-sage/60">
                  <span className="font-mono uppercase text-sage">{symbol ?? "—"}</span>
                  {" · "}#{launch.id.toString()} · by {shortAddress(launch.creator, 6)}
                </p>
                <p className="mt-1 text-sm text-sage/40">
                  Created {createdAt ? formatTimeAgo(createdAt, now) : "…"}
                </p>
                <button
                  onClick={() => void navigator.clipboard.writeText(launch.token)}
                  className="mt-1 flex max-w-full items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-1 font-mono text-xs text-sage/70 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <span className="truncate">{launch.token}</span>
                  <svg
                    className="shrink-0"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="14" height="14" x="8" y="8" rx="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {launch.graduated ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-extrabold tracking-wide text-primary">
                  GRADUATED
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-sage">
                  Live
                </span>
              )}
              <button
                onClick={() =>
                  document.getElementById("trade-panel")?.scrollIntoView({ behavior: "smooth" })
                }
                className="rounded-full bg-[#6CFF32] px-4 py-2 text-xs font-extrabold text-[#0a0a0a] shadow-[0_8px_22px_-8px_rgba(108,255,50,0.7)] transition hover:brightness-110"
              >
                Buy now
              </button>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Price" value={`${formatEth(currentPrice(launch), 7)}`} accent="ETH" />
            <Stat label="Market cap" value={`${formatEth(marketCap(launch), 3)}`} accent="ETH" />
            <Stat label="Reserve" value={`${formatEth(launch.ethReserve, 3)}`} accent="ETH" />
            <Stat label="Sold" value={`${formatTokenAmount(launch.tokensSold, 0)}`} accent="tokens" />
          </div>

          <div className="relative mt-6">
            <div className="mb-1.5 flex items-center justify-between text-xs text-sage/50">
              <span>Bonding curve progress</span>
              <span className="font-mono text-sage/70">{pct.toFixed(2)}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${from}, ${to})`,
                  boxShadow: `0 0 16px ${from}aa`,
                }}
              />
            </div>
            <p className="mt-2 text-xs text-sage/50">
              {formatTokenAmount(launch.tokensSold)} of {formatTokenAmount(launch.totalSupply)}{" "}
              tokens sold on the curve.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-sm backdrop-blur">
          <h2 className="mb-4 font-display font-bold text-white">Details</h2>
          <div className="space-y-3">
            <Info label="Token" value={launch.token} mono />
            <Info label="Creator" value={launch.creator} mono />
            <Info label="Base price" value={`${formatEth(launch.basePrice)} ETH`} />
            <Info label="Slope" value={`${formatEth(launch.slope, 10)} ETH / token`} />
            <Info label="Buy tax" value={formatBps(launch.buyTaxBps)} />
            <Info label="Sell tax" value={formatBps(launch.sellTaxBps)} />
          </div>
        </div>

        {isCreator && (creatorFees ?? 0n) > 0n && (
          <div className="shimmer-border flex items-center justify-between gap-4 rounded-3xl bg-emerald-950/40 p-6">
            <div>
              <p className="font-display font-bold text-emerald-200">Creator fees</p>
              <p className="mt-0.5 text-sm text-emerald-100/70">
                {formatEth(creatorFees ?? 0n)} ETH available to claim
              </p>
            </div>
            <button
              onClick={() =>
                writeContract({
                  address: LAUNCHPAD_ADDRESS,
                  abi: launchpadAbi,
                  functionName: "claimCreatorFees",
                })
              }
              disabled={isPending || isConfirming}
              className="button-shine shrink-0 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_32px_-10px_rgba(16,185,129,0.6)] transition duration-300 hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
            >
              {isPending || isConfirming ? "Claiming…" : "Claim"}
            </button>
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error.message.split("\n")[0]}
          </p>
        )}
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start" id="trade-panel">
        <TradePanel launch={launch} />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl bg-black/20 px-3 py-3">
      <p className="text-xs text-sage/50">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold text-white">
        {value}
        {accent && <span className="ml-1 text-[10px] font-normal text-sage/50">{accent}</span>}
      </p>
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-sage/50">{label}</dt>
      <dd className={mono ? "font-mono text-sage/70" : "text-sage/70"}>
        {mono ? shortAddress(value, 8) : value}
      </dd>
    </div>
  );
}