/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep modern dark UI colors
        panel: {
          bg: '#121214',
          border: '#1f1f23',
          hover: '#1a1a1e',
          text: '#e4e4e7',
          subtext: '#a1a1aa',
        },
        zinc: {
          50: 'var(--zinc-50)',
          100: 'var(--zinc-100)',
          200: 'var(--zinc-200)',
          300: 'var(--zinc-300)',
          400: 'var(--zinc-400)',
          450: 'var(--zinc-450)',
          500: 'var(--zinc-500)',
          550: 'var(--zinc-550)',
          600: 'var(--zinc-600)',
          650: 'var(--zinc-650)',
          700: 'var(--zinc-700)',
          800: 'var(--zinc-800)',
          850: 'var(--zinc-850)',
          900: 'var(--zinc-900)',
          950: 'var(--zinc-950)',
        },
        status: {
          running: 'var(--status-running-text)',
          success: 'var(--status-success-text)',
          warning: 'var(--status-warning-text)',
          error: 'var(--status-error-text)',
        }
      }
    },
  },
  plugins: [],
}
