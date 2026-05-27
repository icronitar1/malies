/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        wine: {
          50:  "#fdf2f4",
          100: "#fce7ec",
          200: "#f9d2db",
          300: "#f4adbf",
          400: "#ec7a96",
          500: "#e04e70",
          600: "#cd2f56",
          700: "#ac2145",
          800: "#8f1e3e",
          900: "#7a1d39",
          950: "#450a1c",
        },
        terracotta: {
          50:  "#fdf6f0",
          100: "#fbeadd",
          200: "#f7d2ba",
          300: "#f1b28c",
          400: "#e9875a",
          500: "#e36835",
          600: "#d44f22",
          700: "#b03d1b",
          800: "#8c321b",
          900: "#712b19",
          950: "#3d130b",
        },
        cream: {
          50: "#fefdf8",
          100: "#fdf9ee",
          200: "#f9f0d4",
          300: "#f3e4ae",
          400: "#ecd280",
          500: "#e3bc52",
        },
        stone: {
          850: "#1c1917",
        }
      },
      backgroundImage: {
        'grain': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      borderRadius: {
        lg: "0.625rem",
        md: "0.5rem",
        sm: "0.375rem",
      },
      boxShadow: {
        'wine': '0 4px 24px -4px rgba(172, 33, 69, 0.25)',
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 12px 32px rgba(0,0,0,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
