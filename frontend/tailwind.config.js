/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary surface palette — zinc-950 base, zinc-900 card, zinc-800 border
        surface: '#09090b',
        card: '#18181b',
        border: '#27272a',
        // Status accent colours — used sparingly per R-01
        accent: '#3b82f6',   // blue-500: active nav, links
        success: '#22c55e',  // green-500: running / live
        warning: '#f59e0b',  // amber-500: restarting
        danger: '#ef4444',   // red-500: stopped / high load
      },
      fontFamily: {
        // System UI stack: legible on all OS, zero flash, matches OS feel
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
      keyframes: {
        pulse_dot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        pulse_dot: 'pulse_dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
