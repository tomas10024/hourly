import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js would redirect `/api/docs/` to `/api/docs`, and the API's Swagger
  // UI redirects back - an endless loop through the proxy route. Paths are
  // served as requested instead.
  skipTrailingSlashRedirect: true,

  async headers() {
    return [
      {
        // Share links carry their token in the address: keep it out of search
        // engines and out of the Referer sent to any site linked from the page.
        source: "/p/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
