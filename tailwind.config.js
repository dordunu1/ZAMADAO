/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ZAMA Color Scheme
        'zama-yellow': '#fff2b5',
        'zama-light-yellow': '#fff6c6', 
        'zama-medium-yellow': '#ffe632',
        'zama-soft-yellow': '#fffbe6',
        'zama-orange': '#ffb243',
        'zama-light-orange': '#ffc97b',
        
        // Primary colors based on ZAMA scheme
        primary: '#ffb243', // zama-orange
        secondary: '#ffe632', // zama-medium-yellow
        accent: '#000000', // black for contrast
        
        // Status colors
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E42',
        info: '#0EA5E9',
        abstain: '#6B7280',
        
        // Background colors
        background: {
          DEFAULT: '#fff2b5', // zama-yellow
          dark: '#1a1a1a'
        },
        card: {
          DEFAULT: '#ffffff',
          dark: '#2a2a2a'
        },
        surface: {
          DEFAULT: '#fffbe6', // zama-soft-yellow
          dark: '#333333'
        },
        border: {
          DEFAULT: '#ffc97b', // zama-light-orange
          dark: '#404040'
        },
        
        // Text colors
        text: {
          primary: {
            DEFAULT: '#000000',
            dark: '#ffffff'
          },
          secondary: {
            DEFAULT: '#333333',
            dark: '#e5e5e5'
          },
          muted: {
            DEFAULT: '#666666',
            dark: '#a3a3a3'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'zama-gradient': 'linear-gradient(135deg, #fff2b5 0%, #fffbe6 50%, #fff6c6 100%)',
        'zama-gradient-dark': 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 50%, #333333 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-subtle': 'pulseSubtle 2s infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #ffb243' },
          '100%': { boxShadow: '0 0 20px #ffb243, 0 0 30px #ffb243' },
        },
      },
      boxShadow: {
        'zama': '0 4px 20px rgba(255, 178, 67, 0.3)',
        'zama-lg': '0 10px 40px rgba(255, 178, 67, 0.4)',
      }
    },
  },
  plugins: [],
};