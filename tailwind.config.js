/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'cyan-25': '#f0fdfa',
        'purple-25': '#fdfaff',
      }
    },
  },
  plugins: [],
  corePlugins: {
    // Ensure line-clamp utilities are available
    lineClamp: true,
  }
};