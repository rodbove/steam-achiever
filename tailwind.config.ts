import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        ink: '#0a0a0a',
        bone: '#f4f1ea',
        ember: '#ff5722',
        moss: '#3d4a3d',
        rust: '#8b3a1f',
      },
    },
  },
  plugins: [],
};

export default config;
