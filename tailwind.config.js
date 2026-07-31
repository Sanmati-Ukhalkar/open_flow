/** @type {import('tailwindcss').Config} */
export default {
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
        }
      }
    },
  },
  plugins: [],
}
