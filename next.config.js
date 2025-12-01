/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
      ANY_API_PDF_INVOICE_GENERATOR_API_KEY: process.env.ANY_API_PDF_INVOICE_GENERATOR_API_KEY,
      ANY_API_CURRENCY_EXCHANGE_API_KEY: process.env.ANY_API_CURRENCY_EXCHANGE_API_KEY,
    },
  }
  
  module.exports = nextConfig