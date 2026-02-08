/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
};
module.exports = nextConfig;
