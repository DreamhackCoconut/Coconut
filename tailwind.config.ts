import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tide: {
          ink: '#0b2239',
          navy: '#123b5d',
          teal: '#0b8c94',
          coral: '#ef7158',
          sand: '#f6f1e8',
          paper: '#fffdf8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
