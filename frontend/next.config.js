/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Required for Supabase auth middleware in Next 15
  },
}
module.exports = nextConfig
