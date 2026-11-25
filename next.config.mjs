/** @type {import('next').NextConfig} */
const nextConfig = {
  // Thumbnails come from platform CDNs; we render them with plain <img>, so no image domains needed.
  serverExternalPackages: [],
};
export default nextConfig;
