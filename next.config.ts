import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: [
    "192.168.1.51",
    "192.168.1.*",
    "10.0.0.*",
    "10.188.2.*",
  ],
};

export default nextConfig;
