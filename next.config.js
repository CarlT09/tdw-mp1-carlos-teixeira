/** @type {import('next').NextConfig} */
module.exports = {
  output: "export",
  images: {
    loader: "custom",
    formats: ["image/avif", "image/webp"],
  },
};
