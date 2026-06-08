/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#eab308',
        anomaly: '#f97316',
      },
      fontSize: {
        xs: '12px',
        sm: '14px',
        base: '16px',
        lg: '18px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '30px',
        '4xl': '36px',
      },
      minHeight: {
        touch: '48px',
      },
    },
  },
  plugins: [],
}
