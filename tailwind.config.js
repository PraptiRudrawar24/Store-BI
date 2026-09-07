/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Stitch Token Theme Colors mapped through CSS Variables
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        'primary-light': 'var(--color-primary-light)',
        'primary-container': 'var(--color-primary-container)',
        secondary: 'var(--color-secondary)',
        'secondary-container': 'var(--color-secondary-container)',
        tertiary: 'var(--color-tertiary)',
        surface: 'var(--color-surface)',
        'surface-card': 'var(--color-surface-card)',
        'surface-container': 'var(--color-surface-container)',
        'surface-container-high': 'var(--color-surface-container-high)',
        'surface-container-low': 'var(--color-surface-container-low)',
        background: 'var(--color-background)',
        'border-subtle': 'var(--color-border-subtle)',
        'text-primary': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',
        'growth-teal': '#0D9488',
        'alert-amber': '#D97706',
        'danger-red': '#DC2626',
      },
      fontFamily: {
        geist: ['Geist', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'stitch-card': 'var(--shadow-card)',
        'stitch-clay': 'var(--shadow-clay)',
        'stitch-glass': 'var(--shadow-glass)',
      },
      borderRadius: {
        'stitch': 'var(--radius-base)',
      }
    },
  },
  plugins: [],
};
