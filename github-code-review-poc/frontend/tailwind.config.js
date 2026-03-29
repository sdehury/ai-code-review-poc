/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#eff6ff', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
        critical: '#dc2626',
        high: '#ea580c',
        medium: '#d97706',
        low: '#16a34a',
      },
    },
  },
  plugins: [],
}
