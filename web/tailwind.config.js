/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Amber "phosphor" brand. 500 is the accent; text sitting on it uses `brand-ink`, since white on amber
        // does not read.
        brand: {
          50: '#fff8eb',
          100: '#feedc8',
          200: '#fddb91',
          300: '#fbc65a',
          400: '#f8b43a',
          500: '#f5a524',
          600: '#dc8c0e',
          700: '#b46d0a',
          800: '#8c540e',
          900: '#73450f',
          ink: '#1a1204',
        },
        // The whole app was written against Tailwind's `slate`. Instead of rewriting every page, slate itself is
        // remapped to the warm near-black of the design (design/README.md), so 900 is the page background,
        // 800 the surfaces, 700/600 the borders and 500..100 the text steps.
        slate: {
          50: '#f6f5f0',
          100: '#ecebe4',
          200: '#dcdbd3',
          300: '#c3c3ba',
          400: '#a4a69c',
          500: '#6c6f65',
          600: '#3a3e35',
          700: '#2a2d26',
          800: '#161814',
          900: '#0e0f0c',
          950: '#090a08',
        },
        // Named tokens from the design, for new code.
        bg: { DEFAULT: '#0e0f0c', 2: '#141612', 3: '#1b1d18' },
        line: { DEFAULT: '#2a2d26', 2: '#3a3e35' },
        ink: { DEFAULT: '#ecebe4', 2: '#a4a69c', 3: '#6c6f65' },
        ok: '#8fd16a',
      },
      // Small radii everywhere (4px controls, 6px cards and panels): the old rounded-lg / rounded-xl look was part of
      // the generic template feel.
      borderRadius: {
        lg: '0.375rem',
        xl: '0.375rem',
        '2xl': '0.5rem',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        blink: {
          '50%': { opacity: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        blink: 'blink 1.1s steps(1) infinite',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 180ms ease-out',
      },
    },
  },
  plugins: [],
}
