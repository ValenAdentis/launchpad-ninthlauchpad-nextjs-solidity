"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { decodeEventLog, parseEther, type Log } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { setTokenAvatar } from "@/lib/avatars";
import { setTokenCreatedAt } from "@/lib/created-at";
import {
  LAUNCHPAD_ADDRESS,
  formatEth,
  isLaunchpadConfigured,
  launchpadAbi,
} from "@/lib/launchpad";

const DEFAULTS = {
  supply: "1000000",
  basePrice: "0.000001",
  slope: "0.00000001",
  buyTax: "1",
  sellTax: "1",
};

function hashHue(...parts: string[]): number {
  const s = parts.join("").toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}

const MAX_TAX_PERCENT = 10;

/** Parse a percentage string ("1", "1.5") into basis points (100, 150). */
function percentToBps(value: string): number | null {
  const n = Number(value.trim());
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > MAX_TAX_PERCENT) return null;
  return Math.round(n * 100);
}

const MAX_IMAGE_BYTES = 2_000_000;

/** Downscale an uploaded image to a small square-ish webp/png data URI. */
function resizeToDataUri(src: string, size = 256): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/webp", 0.85) || canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function CreateLaunchForm() {
  const router = useRouter();
  const { isConnected } = useAccount();

  const { data: creationFee } = useReadContract({
    address: LAUNCHPAD_ADDRESS,
    abi: launchpadAbi,
    functionName: "creationFee",
    query: { enabled: isLaunchpadConfigured },
  });

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supply, setSupply] = useState(DEFAULTS.supply);
  const [basePrice, setBasePrice] = useState(DEFAULTS.basePrice);
  const [slope, setSlope] = useState(DEFAULTS.slope);
  const [buyTax, setBuyTax] = useState(DEFAULTS.buyTax);
  const [sellTax, setSellTax] = useState(DEFAULTS.sellTax);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isSuccess || !receipt) return;
    for (const log of receipt.logs as Log[]) {
      try {
        const decoded = decodeEventLog({
          abi: launchpadAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "Launched") {
          setTokenCreatedAt(decoded.args.id);
          if (image) {
            setTokenAvatar(decoded.args.token as `0x${string}`, image);
          }
          router.push(`/launch/${decoded.args.id}`);
          return;
        }
      } catch {
        // ignore logs from other contracts
      }
    }
  }, [isSuccess, receipt, router, image]);

  const parsed = useMemo(() => {
    const totalSupply = (() => {
      try {
        return parseEther(supply.trim());
      } catch {
        return null;
      }
    })();
    const bp = (() => {
      try {
        return parseEther(basePrice.trim());
      } catch {
        return null;
      }
    })();
    const sl = (() => {
      try {
        return parseEther(slope.trim());
      } catch {
        return null;
      }
    })();
    const buyBps = percentToBps(buyTax);
    const sellBps = percentToBps(sellTax);
    return { totalSupply, bp, sl, buyBps, sellBps };
  }, [supply, basePrice, slope, buyTax, sellTax]);

  const valid =
    parsed.totalSupply != null &&
    parsed.bp != null &&
    parsed.sl != null &&
    parsed.buyBps != null &&
    parsed.sellBps != null;

  function onImageFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be under 2 MB");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Unsupported image type — use JPG, PNG, WebP or GIF");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      void resizeToDataUri(reader.result as string)
        .then((uri) => {
          if (uri) setImage(uri);
          else setError("Could not process the image");
        });
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (!name.trim() || !symbol.trim()) throw new Error("Name and symbol are required");
      const totalSupply = parseEther(supply.trim());
      const bp = parseEther(basePrice.trim());
      const sl = parseEther(slope.trim());
      const buyBps = percentToBps(buyTax);
      const sellBps = percentToBps(sellTax);
      if (totalSupply <= 0n || totalSupply % 10n ** 18n !== 0n) {
        throw new Error("Supply must be a whole number of tokens");
      }
      if (bp <= 0n || sl <= 0n) throw new Error("Price and slope must be greater than zero");
      if (buyBps == null || sellBps == null) {
        throw new Error(`Buy and sell tax must be between 0% and ${MAX_TAX_PERCENT}%`);
      }

      writeContract({
        address: LAUNCHPAD_ADDRESS,
        abi: launchpadAbi,
        functionName: "createLaunch",
        args: [name.trim(), symbol.trim().toUpperCase(), totalSupply, bp, sl, BigInt(buyBps), BigInt(sellBps)],
        value: creationFee ?? 0n,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid input");
    }
  }

  const busy = isPending || isConfirming;
  const disabled = !isLaunchpadConfigured || !isConnected || busy;

  const hue = hashHue(name, symbol);
  const from = `hsl(${hue} 85% 55%)`;
  const to = `hsl(${(hue + 50) % 360} 85% 60%)`;

  const curveMax = (parsed.bp ?? 0n) + ((parsed.sl ?? 0n) * (parsed.totalSupply ?? 0n)) / 10n ** 18n;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <form
        onSubmit={onSubmit}
        className="relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-panel/80 p-6 backdrop-blur sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(108,255,50,0.7), rgba(216,222,201,0.7), transparent)",
          }}
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-white">Create Token</h2>
            <p className="text-base text-sage/60">Deploy a token on the bonding curve.</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-bold tracking-widest text-sage/50">TOKEN INFO</p>
          <div className="grid gap-4 sm:grid-cols-[104px_1fr]">
            <label className="group relative mx-auto block h-[104px] w-[104px] cursor-pointer">
              {image ? (
                <span
                  className="block h-full w-full rounded-2xl ring-1 ring-white/15"
                  style={{
                    backgroundImage: `url("${image}")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              ) : (
                <span
                  className="grid h-full w-full place-items-center rounded-2xl text-3xl font-black text-white ring-1 ring-white/15"
                  style={{
                    background: `linear-gradient(135deg, ${from}, ${to})`,
                    boxShadow: `0 14px 34px -12px ${from}`,
                  }}
                >
                  {(symbol.trim() || name.trim() || "?").slice(0, 4).toUpperCase()}
                </span>
              )}
              <span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/55 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                {image ? "Change" : "Upload"}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => onImageFile(e.target.files?.[0])}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Token"
                  className={inputClass}
                />
              </Field>
              <Field label="Symbol (ticker)">
                <input
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="AWESOME"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-bold tracking-widest text-sage/50">BONDING CURVE</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Total supply (whole tokens)">
              <input
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
                inputMode="numeric"
                className={inputClass}
              />
            </Field>
            <Field label="Base price (ETH)">
              <input
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </Field>
            <Field label="Slope (ETH / token)">
              <input
                value={slope}
                onChange={(e) => setSlope(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </Field>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-3 text-sm font-bold tracking-widest text-sage/50">TRADE TAX</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Buy tax (%)">
              <input
                value={buyTax}
                onChange={(e) => setBuyTax(e.target.value)}
                inputMode="decimal"
                placeholder="1"
                className={inputClass}
              />
            </Field>
            <Field label="Sell tax (%)">
              <input
                value={sellTax}
                onChange={(e) => setSellTax(e.target.value)}
                inputMode="decimal"
                placeholder="1"
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-sage/50">
            Tax is charged on every buy and sell and split 50/50 between the token creator and
            the protocol. Max {MAX_TAX_PERCENT}% each.
          </p>
        </div>

        <div className="mb-5 flex items-center justify-between rounded-xl bg-black/25 px-4 py-3 text-base">
          <span className="text-sage/60">Creation fee</span>
          <span className="font-mono font-semibold text-white">
            {creationFee == null ? "—" : `${formatEth(creationFee)} ETH`}
          </span>
        </div>

        {(error || writeError) && (
          <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error ?? writeError?.message.split("\n")[0]}
          </p>
        )}

        {isConfirming && <p className="mb-4 text-sm text-sage/60">Waiting for confirmation…</p>}

        <button
          type="submit"
          disabled={disabled}
          className="button-shine w-full rounded-xl bg-[#6CFF32] px-4 py-4 text-base font-extrabold text-[#0a0a0a] shadow-[0_12px_30px_-10px_rgba(108,255,50,0.6)] transition duration-300 hover:brightness-110 hover:shadow-[0_16px_38px_-10px_rgba(108,255,50,0.8)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? "Creating…" : isConnected ? "Create token" : "Connect wallet to launch"}
        </button>
      </form>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="relative overflow-hidden rounded-[14px] border border-white/[0.07] bg-panel/80 p-6 backdrop-blur">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background: `radial-gradient(420px circle at 110% -20%, ${from}22, transparent 60%)`,
            }}
          />
          <p className="mb-4 text-sm font-bold tracking-widest text-sage/50">LIVE PREVIEW</p>

          <div className="relative flex items-center gap-4">
            {image ? (
              <span
                className="h-20 w-20 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/15"
                style={{
                  backgroundImage: `url("${image}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ) : (
              <span
                className="grid h-20 w-20 shrink-0 place-items-center rounded-xl text-2xl font-black text-white ring-1 ring-white/15"
                style={{
                  background: `linear-gradient(135deg, ${from}, ${to})`,
                  boxShadow: `0 12px 30px -12px ${from}`,
                }}
              >
                {(symbol.trim() || name.trim() || "?").slice(0, 4).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-2xl font-extrabold text-white">
                {name.trim() || "Token name"}
              </p>
              <p className="text-base text-sage/60">
                {(symbol.trim() || "TICKER").toUpperCase()} · {supply.trim() || "0"} supply
              </p>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-black/25 px-3 py-3">
              <p className="text-xs text-sage/50">Buy tax</p>
              <p className="mt-0.5 font-mono text-base text-white">
                {parsed.buyBps != null ? `${parsed.buyBps / 100}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 px-3 py-3">
              <p className="text-xs text-sage/50">Sell tax</p>
              <p className="mt-0.5 font-mono text-base text-white">
                {parsed.sellBps != null ? `${parsed.sellBps / 100}%` : "—"}
              </p>
            </div>
            <div className="rounded-xl bg-black/25 px-3 py-3">
              <p className="text-xs text-sage/50">Base price</p>
              <p className="mt-0.5 truncate font-mono text-base text-white">
                {formatEth(parsed.bp ?? 0n, 8)} ETH
              </p>
            </div>
            <div className="rounded-xl bg-black/25 px-3 py-3">
              <p className="text-xs text-sage/50">Curve top</p>
              <p className="mt-0.5 truncate font-mono text-base text-white">
                {formatEth(curveMax, 6)} ETH
              </p>
            </div>
          </div>

          <div className="relative mt-5">
            <p className="mb-2 text-[11px] text-sage/50">Bonding curve</p>
            <svg viewBox="0 0 260 80" className="w-full">
              <line x1="10" y1="70" x2="250" y2="70" stroke="rgba(255,255,255,0.08)" />
              <line x1="10" y1="70" x2="10" y2="10" stroke="rgba(255,255,255,0.08)" />
              <line
                x1="10"
                y1="70"
                x2="250"
                y2="10"
                stroke="#6CFF32"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 6px rgba(108,255,50,0.8))" }}
              />
              <circle cx="10" cy="70" r="3.5" fill="#6CFF32" />
              <text x="14" y="84" fontSize="11" fill="rgba(214,222,199,0.5)">
                0 tokens
              </text>
              <text x="196" y="84" fontSize="11" fill="rgba(214,222,199,0.5)">
                {supply.trim() || "0"} sold
              </text>
            </svg>
          </div>

          <div className="relative mt-4 rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2.5 text-sm text-sage/60">
            {valid ? (
              <>
                Launching costs <span className="font-mono text-primary">0.001 ETH</span> and your
                token is instantly tradable on the curve.
              </>
            ) : (
              "Enter a valid supply, base price, slope and taxes to preview your curve."
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3.5 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-sage/60">{label}</span>
      {children}
    </label>
  );
}