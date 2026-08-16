import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Redirect old single-course routes to the new multi-course structure
      {
        source: '/learn/:chapterId(\\d+)',
        destination: '/learn/promptpath-starter/:chapterId',
        permanent: false,
      },
      {
        source: '/learn/:chapterId(\\d+)/:topicId',
        destination: '/learn/promptpath-starter/:chapterId/:topicId',
        permanent: false,
      },
    ]
  },
}

export default nextConfig;
