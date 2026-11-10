import { existsSync } from "node:fs"
import type { NextConfig } from "next"

if (existsSync("../../.env")) process.loadEnvFile("../../.env")

const config: NextConfig = {
  transpilePackages: ["@glyphswap/shared", "@glyphswap/db"],
  poweredByHeader: false,
}

export default config
