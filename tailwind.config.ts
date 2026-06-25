import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F8FC',
        ink: { DEFAULT: '#0B1F4D', 2: '#1A2F66', soft: '#4A5680', mute: '#8B93AC' },
        yellow: { DEFAULT: '#FFCB3D', soft: '#FFF4D1', deep: '#E5B12C' },
        line: { DEFAULT: '#E7EAF3', soft: '#F0F2F8' },
        green: { DEFAULT: '#2BB673', soft: '#E0F4EB' },
        red: { DEFAULT: '#E5484D', soft: '#FBE4E5' },
        'blue-soft': '#E8EDFA',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
