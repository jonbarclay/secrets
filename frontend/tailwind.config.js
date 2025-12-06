/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        uvu: {
          500: '#006633',
          600: '#00562a',
          700: '#00451f'
        }
      }
    }
  },
  plugins: []
}
