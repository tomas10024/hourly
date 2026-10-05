import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js would redirect `/api/docs/` to `/api/docs`, and the API's Swagger
  // UI redirects back - an endless loop through the proxy route. Paths are
  // served as requested instead.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
