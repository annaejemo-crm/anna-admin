import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f5f2ed',
        'bg-subtle': '#ece7de',
        ink: '#2a2520',
        'ink-muted': '#6b6358',
        'ink-faint': '#a69f92',
        line: '#d9d2c4',
        'line-soft': '#e8e2d5',
        accent: '#b5744d',
        sage: '#7e8a6f',
        positive: '#5e7a5a',
        warn: '#c8903b',
        danger: '#a84e3d',
      },
      fontFamily: {
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
