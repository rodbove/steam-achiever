/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.cloudflare.steamstatic.com' },
      { protocol: 'https', hostname: 'media.steampowered.com' },
      { protocol: 'https', hostname: 'steamcdn-a.akamaihd.net' },
    ],
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
