/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgPage: '#F4F5F7',
        bgSurface: '#FFFFFF',
        bgToolbar: '#F9FAFB',
        borderSubtle: '#E5E7EB',
        primary: '#2563EB',
        primarySoft: '#DBEAFE',
        textMain: '#111827',
        textMuted: '#6B7280',
        danger: '#EF4444',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '14px',
      },
      boxShadow: {
        'soft': '0 4px 12px rgba(15, 23, 42, 0.06)',
        'subtle': '0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
