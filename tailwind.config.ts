import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        background: '#0a0a0b',
        foreground: '#f0ede8',
        card: {
          DEFAULT: '#111114',
          foreground: '#f0ede8',
        },
        popover: {
          DEFAULT: '#111114',
          foreground: '#f0ede8',
        },
        primary: {
          DEFAULT: '#c9a84c',
          foreground: '#0a0a0b',
        },
        secondary: {
          DEFAULT: '#1e1e24',
          foreground: '#f0ede8',
        },
        muted: {
          DEFAULT: '#1e1e24',
          foreground: '#9b9aa0',
        },
        accent: {
          DEFAULT: '#c9a84c',
          foreground: '#0a0a0b',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#f0ede8',
        },
        border: '#1e1e24',
        input: '#1e1e24',
        ring: '#c9a84c',
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e8c875',
          dark: '#a8873a',
        },
        surface: {
          DEFAULT: '#111114',
          elevated: '#16161a',
          overlay: '#1a1a20',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        wedding: ['Cormorant Garamond', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        shimmer: 'shimmer 2s infinite linear',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #c9a84c 0%, #e8c875 50%, #c9a84c 100%)',
        'dark-gradient': 'linear-gradient(180deg, #111114 0%, #0a0a0b 100%)',
        'card-gradient': 'linear-gradient(135deg, #111114 0%, #16161a 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
