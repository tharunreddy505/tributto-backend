/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D4AF37', // Gold
        dark: '#1A1A1A', // Dark charcoal
        light: '#F9F9F9', // Off-white
        'text-gray': '#666666',
      },
      fontFamily: {
        sans: ['Figtree', 'sans-serif'],
        serif: ['Figtree', 'serif'],
        description: ['Manrope', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
