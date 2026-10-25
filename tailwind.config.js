/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.vue'],
  // Scope every utility under .vcp so the shipped CSS never touches the host app.
  important: '.vcp',
  darkMode: 'class',
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--vcp-primary, #2563eb)',
          foreground: 'var(--vcp-primary-foreground, #ffffff)',
        },
      },
    },
  },
}
