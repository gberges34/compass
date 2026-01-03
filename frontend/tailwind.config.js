/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Compass Design System Colors
      colors: {
        // Core Neutrals
        snow: '#FCFCFD',
        cloud: '#F6F7F9',
        fog: '#EEF0F3',
        stone: '#D7DBE0',
        slate: '#8A94A6',
        ink: '#0F172A',

        // Pastel Accents
        mint: '#C9F0DE',
        sky: '#CFE9FF',
        lavender: '#E1D9FF',
        blush: '#FFDDE6',
        sun: '#FFEFC6',
        rose: '#F4AFAF',
        peach: '#F4D1C2',
        apricot: '#F7DDB6',
        butter: '#F4F0CD',
        lime: '#E6F4AF',
        pistachio: '#DBF4C2',
        leaf: '#C3F7B6',
        spearmint: '#CDF4D0',
        jade: '#AFF4CA',
        aqua: '#C2F4E5',
        glacier: '#B6F7F7',
        ice: '#CDE8F4',
        azure: '#AFCAF4',
        periwinkle: '#C2C7F4',
        iris: '#C3B6F7',
        lilac: '#E0CDF4',
        orchid: '#E6AFF4',
        mauve: '#F4C2EF',
        pink: '#F7B6DD',
        petal: '#F4CDD8',

        // Action Colors
        action: {
          DEFAULT: '#2A6FF2',
          hover: '#255FD0',
        },
        success: '#22C55E',
        warn: '#F59E0B',
        danger: '#EF4444',
      },

      // Typography - Inter font family
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },

      // Type Scale (4-pt rhythm)
      fontSize: {
        'display': ['48px', { lineHeight: '56px', fontWeight: '600', letterSpacing: '-0.02em' }],
        'h1': ['32px', { lineHeight: '40px', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h2': ['24px', { lineHeight: '32px', fontWeight: '500', letterSpacing: '-0.01em' }],
        'h3': ['20px', { lineHeight: '28px', fontWeight: '500', letterSpacing: '-0.01em' }],
        'body': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'small': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'micro': ['12px', { lineHeight: '16px', fontWeight: '400' }],
      },

      // Spacing Tokens (8-pt grid)
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
        '64': '64px',
      },

      // Border Radius
      borderRadius: {
        'default': '12px',
        'card': '16px',
        'modal': '24px',
        'pill': '999px',
      },

      // Elevation Shadows
      boxShadow: {
        'e01': '0 1px 2px rgba(15, 23, 42, 0.06)',
        'e02': '0 4px 16px rgba(15, 23, 42, 0.08)',
        'eglass': '0 8px 32px rgba(15, 23, 42, 0.12)',
      },

      // Backdrop Blur for Glass Effect
      backdropBlur: {
        'glass': '20px',
      },

      // Animations
      animation: {
        'slideIn': 'slideIn 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
        'fadeIn': 'fadeIn 0.16s cubic-bezier(0.22, 1, 0.36, 1)',
        'scaleIn': 'scaleIn 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      },

      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },

      // Transition Durations
      transitionDuration: {
        'micro': '160ms',
        'standard': '240ms',
        'modal': '300ms',
      },
    },
  },
  plugins: [],
}
