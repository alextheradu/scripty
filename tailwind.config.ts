import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0f11', surface: '#1a1a1f', border: '#2a2a30',
        paper: '#fffef7', accent: '#e8b86d', 'accent-dim': '#b8904a',
        text: '#e8e6de', muted: '#6b6a64', danger: '#e05252',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        ui: ['Syne', 'sans-serif'],
        mono: ['"Courier Prime"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
