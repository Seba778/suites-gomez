/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'gomez-gold': '#d97706',
        'gomez-dark': '#0c0a09',
      }
    },
  },
  plugins: [],
}