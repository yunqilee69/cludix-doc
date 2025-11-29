import type { Config } from 'tailwindcss'

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,md,mdx}',
    './blog/**/*.{js,jsx,ts,tsx,md,mdx}',
    './docs/**/*.{js,jsx,ts,tsx,md,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config

