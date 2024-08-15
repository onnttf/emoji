/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/emoji",
      },
    ];
  },
};

export default nextConfig;
