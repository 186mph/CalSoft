/** @type {import('tailwindcss').Config} */
const animate = require("tailwindcss-animate");

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        amp: {
          orange: {
            50: '#FFF4ED',
            100: '#FFE9DB',
            200: '#FFD3B8',
            300: '#FFBD94',
            400: '#FFA770',
            500: '#FF914D',
            600: '#FF7B29',
            700: '#FF6400',
            800: '#CC5000',
            900: '#993C00'
          }
        },
        dark: {
          50: '#1A1A1A',        // Darkest background
          100: '#1E1E1E',       // Slightly lighter background
          150: '#202020',       // Header/sidebar background
          200: '#242424',       // Card background
          300: '#282828',       // Border color
          400: '#FFFFFF',       // Text (white)
          500: '#FFFFFF',       // Text (white)
          600: '#FFFFFF',       // Text (white)
          700: '#FF6400',       // Buttons/hover (orange)
          800: '#FFFFFF',       // Text (white)
          900: '#FFFFFF',       // Text (white)
          background: '#1A1A1A',
          accent: '#FF6400'     // Orange accent
        },
        cozy: {
          cream: {
            50: '#FFFDF7',
            100: '#FFF9E9',
            200: '#FFF3D3',
            300: '#FFEDC1',
            400: '#FFE7AF',
            500: '#FFE19D',
            600: '#EBC878',
            700: '#D7B05A',
            800: '#C3973E',
            900: '#A67E22'
          },
          wood: {
            50: '#F8F4F0',
            100: '#F2E8E1',
            200: '#E5D1C3',
            300: '#D8BAA5',
            400: '#CBA387',
            500: '#BE8C69',
            600: '#A6754B',
            700: '#8D5F3D',
            800: '#6B482F',
            900: '#4E3522'
          },
          moss: {
            50: '#F0F5F0',
            100: '#DCEADC',
            200: '#C0D6C0',
            300: '#A5C2A5',
            400: '#8BAE8B',
            500: '#719A71',
            600: '#578657',
            700: '#3D723D',
            800: '#2A5F2A',
            900: '#1A4C1A'
          },
          terracotta: {
            50: '#FCF2F0',
            100: '#F9E5E1',
            200: '#F4CCC4',
            300: '#EDB3A7',
            400: '#E79A8A',
            500: '#E0816D',
            600: '#D6684F',
            700: '#C04F32',
            800: '#9A3B24',
            900: '#742C1A'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Quicksand', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif']
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px rgba(0, 0, 0, 0.05)',
        'cozy': '0 8px 30px rgba(0, 0, 0, 0.08)',
        'inner-soft': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.04)'
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate],
}; 