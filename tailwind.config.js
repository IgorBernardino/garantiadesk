/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#e8f0fb',
          100: '#c3d5f5',
          200: '#9ab8ef',
          400: '#4a86e0',
          600: '#1a56c4',
          800: '#0f3480',
          900: '#071f52',
        },
      },
    },
  },
  plugins: [],
}
