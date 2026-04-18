import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dynamic redirects (e.g. `?next=/rooms/...`) are incompatible with strict route typing.
  typedRoutes: false,
};

export default nextConfig;
