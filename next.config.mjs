/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { 
    ignoreBuildErrors: true 
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
  // ZMĚNĚNO: V Next.js 15+ je swcMinify automatické. 
  // Pro vynucení moderního kódu stačí mít správný browserslist v package.json, 
  // který už jsme tam přidali.
};

export default nextConfig;