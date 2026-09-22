import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // The Coinbase CDP SDK dynamically imports these optional packages. They are
      // never executed by this app, so route them to an empty stub to keep the
      // bundle resolvable.
      "@x402/core/client": "./src/lib/empty.ts",
      "@x402/evm": "./src/lib/empty.ts",
      "@x402/evm/exact/client": "./src/lib/empty.ts",
      "@x402/evm/upto/client": "./src/lib/empty.ts",
      "@x402/svm/exact/client": "./src/lib/empty.ts",
    },
  },
};

export default nextConfig;