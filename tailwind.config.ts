import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        landing: {
          aqua: {
            DEFAULT: '#00F0C8',
            dark: '#00C4A3',
            light: '#E6FDF9',
          },
          mango: {
            DEFAULT: '#FFB703',
            dark: '#E6A503',
            light: '#FFF8E6',
          },
          tropical: {
            DEFAULT: '#FDE74C',
            dark: '#E6D044',
            light: '#FFFCE8',
          },
          mint: {
            DEFAULT: '#38F9A0',
            dark: '#2DD98A',
            light: '#EBFEF5',
          },
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'calc(var(--radius) + 2px)',
        md: 'var(--radius)',
        sm: 'calc(var(--radius) - 2px)'
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
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-in': {
          from: { transform: 'translateY(10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(3deg)' },
        },
        'drift': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '33%': { transform: 'translate(12px, -16px)' },
          '66%': { transform: 'translate(-10px, 12px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.35', transform: 'scale(1)' },
          '50%': { opacity: '0.65', transform: 'scale(1.05)' },
        },
        'orbit': {
          '0%': { transform: 'rotate(0deg) translateX(80px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(80px) rotate(-360deg)' },
        },
        'flow-line': {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
        'marquee': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'run-across': {
          '0%': { transform: 'translateX(-20vw)', opacity: '0' },
          '4%': { opacity: '1' },
          '96%': { opacity: '1' },
          '100%': { transform: 'translateX(110vw)', opacity: '0' },
        },
        'run-across-reverse': {
          '0%': { transform: 'translateX(110vw) scaleX(-1)', opacity: '0' },
          '4%': { opacity: '1' },
          '96%': { opacity: '1' },
          '100%': { transform: 'translateX(-20vw) scaleX(-1)', opacity: '0' },
        },
        'dog-bob': {
          '0%, 100%': { transform: 'translateY(0) rotate(-2deg)' },
          '25%': { transform: 'translateY(-6px) rotate(0deg)' },
          '50%': { transform: 'translateY(0) rotate(2deg)' },
          '75%': { transform: 'translateY(-4px) rotate(0deg)' },
        },
        'paw-fade': {
          '0%': { opacity: '0', transform: 'scale(0.4)' },
          '12%': { opacity: '0.45', transform: 'scale(1)' },
          '70%': { opacity: '0.12', transform: 'scale(1.05)' },
          '100%': { opacity: '0', transform: 'scale(0.7)' },
        },
        'float-rise': {
          '0%': { opacity: '0', transform: 'translateY(0) rotate(0deg)' },
          '15%': { opacity: '0.5' },
          '85%': { opacity: '0.15' },
          '100%': { opacity: '0', transform: 'translateY(-80px) rotate(20deg)' },
        },
        'ball-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-24px)' },
        },
        'tail-wag': {
          '0%, 100%': { transform: 'rotate(-20deg)' },
          '50%': { transform: 'rotate(20deg)' },
        },
        'leg-run': {
          '0%, 100%': { transform: 'rotate(-25deg)' },
          '50%': { transform: 'rotate(25deg)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'blueprint-node-in': {
          '0%': { opacity: '0', transform: 'translate(-50%, -50%) scale(0.85)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'blueprint-line-in': {
          '0%': { strokeDashoffset: '55', opacity: '0' },
          '100%': { strokeDashoffset: '0', opacity: '1' },
        },
        'blueprint-connected-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.08)' },
          '50%': { boxShadow: '0 0 6px 1px rgba(16, 185, 129, 0.18)' },
        },
        'blueprint-float-soft': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'blueprint-sparkle': {
          '0%, 100%': { opacity: '0', transform: 'scale(0.6)' },
          '50%': { opacity: '0.35', transform: 'scale(1)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'drift': 'drift 8s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
        'orbit': 'orbit 20s linear infinite',
        'flow-line': 'flow-line 1.5s linear infinite',
        'marquee': 'marquee 12s linear infinite',
        'run-across': 'run-across 16s linear infinite',
        'run-across-slow': 'run-across 24s linear infinite',
        'run-across-reverse': 'run-across-reverse 20s linear infinite',
        'dog-bob': 'dog-bob 0.35s ease-in-out infinite',
        'paw-fade': 'paw-fade 5s ease-in-out infinite',
        'float-rise': 'float-rise 6s ease-in-out infinite',
        'ball-bounce': 'ball-bounce 2s ease-in-out infinite',
        'tail-wag': 'tail-wag 0.25s ease-in-out infinite',
        'leg-run': 'leg-run 0.2s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'blueprint-node-in': 'blueprint-node-in 0.4s ease-out forwards',
        'blueprint-line-in': 'blueprint-line-in 0.7s ease-out forwards',
        'blueprint-connected-glow': 'blueprint-connected-glow 3.5s ease-in-out infinite',
        'blueprint-float-soft': 'blueprint-float-soft 7s ease-in-out infinite',
        'blueprint-sparkle': 'blueprint-sparkle 3.5s ease-in-out infinite',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
          },
        },
      },
    }
  },
  plugins: [
    animate,
    typography,
  ],
} satisfies Config;
