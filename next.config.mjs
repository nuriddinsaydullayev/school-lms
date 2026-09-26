/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Bu qator Vercel'ga mayda xatolarga e'tibor bermaslikni buyuradi
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Typescript xatolarini ham e'tiborsiz qoldiradi
    ignoreBuildErrors: true,
  }
};

export default nextConfig;