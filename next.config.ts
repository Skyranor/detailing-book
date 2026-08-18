import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: { root: import.meta.dirname },
  // Главы читаются из файлов на диске во время сборки, поэтому все
  // страницы статические. На Vercel это раздача с CDN без сервера.
  outputFileTracingIncludes: {
    '/read/[slug]': ['./chapters/**/*'],
  },
};

export default nextConfig;
