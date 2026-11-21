import type { NextConfig } from 'next'

const config: NextConfig = {
  // the shared data model is TypeScript source in ../shared
  transpilePackages: ['shared'],
}

export default config
