/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    styledComponents: true
  },
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.csv$/,
      loader: 'file-loader',
      options: {
        name: '[path][name].[ext]',
      },
    });
    return config;
  }
}

module.exports = nextConfig 