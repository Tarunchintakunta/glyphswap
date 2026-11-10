import type { NextConfig } from "next"

const config: NextConfig = {
  transpilePackages: ["@glyphswap/shared", "@glyphswap/db"],
  poweredByHeader: false,
}

export default config
