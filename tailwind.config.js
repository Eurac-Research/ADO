/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}', // Note the addition of the `app` directory.
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',

    // Or if using `src` directory:
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            // Additional custom prose styling if needed
            maxWidth: 'none',
            color: '#374151',
            'h1, h2, h3, h4, h5, h6': {
              color: '#111827',
            },
            'blockquote': {
              borderLeftWidth: '4px',
              borderLeftColor: '#d1d5db',
              backgroundColor: '#f9fafb',
              paddingLeft: '1rem',
              paddingTop: '0.5rem',
              paddingBottom: '0.5rem',
            },
            'code': {
              backgroundColor: '#f3f4f6',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              borderRadius: '0.25rem',
              fontSize: '0.875rem',
            },
            'pre': {
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              padding: '1rem',
              overflow: 'auto',
            },
            '[class~="dark"] &': {
              color: '#d1d5db',
              'h1, h2, h3, h4, h5, h6': {
                color: '#f9fafb',
              },
              'blockquote': {
                borderLeftColor: '#4b5563',
                backgroundColor: '#1f2937',
                color: '#d1d5db',
              },
              'code': {
                backgroundColor: '#1f2937',
                color: '#e5e7eb',
              },
              'pre': {
                backgroundColor: '#1f2937',
                borderColor: '#374151',
                color: '#e5e7eb',
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}