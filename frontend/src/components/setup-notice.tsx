import { LAUNCHPAD_ADDRESS } from "@/lib/launchpad";

export function SetupNotice() {
  return (
    <div className="rounded-3xl border border-amber-500/25 bg-amber-500/[0.06] p-6 text-sm text-amber-100 backdrop-blur">
      <h2 className="mb-2 font-display text-base font-bold text-amber-200">
        Launchpad not configured
      </h2>
      <p className="mb-3 text-amber-100/80">
        Deploy the contracts and set the address in{" "}
        <code className="font-mono">.env.local</code>.
      </p>
      <pre className="overflow-x-auto rounded-2xl bg-black/40 p-4 font-mono text-xs leading-relaxed text-amber-50">
{`# terminal 1
cd contracts && anvil

# terminal 2
cd contracts && forge script script/Deploy.s.sol \\
  --rpc-url http://127.0.0.1:8545 \\
  --broadcast

# frontend/.env.local
NEXT_PUBLIC_LAUNCHPAD_ADDRESS=0x<deployed-address>
NEXT_PUBLIC_WC_PROJECT_ID=<walletconnect-project-id>`}
      </pre>
      <p className="mt-3 text-xs text-amber-100/60">
        Current value: <code className="font-mono">{LAUNCHPAD_ADDRESS || "(empty)"}</code>
      </p>
    </div>
  );
}