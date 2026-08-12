/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 1px 2px hsl(var(--foreground) / 0.04), 0 8px 24px -6px hsl(var(--foreground) / 0.08)",
        card: "0 2px 8px -2px hsl(var(--foreground) / 0.06), 0 12px 40px -12px hsl(var(--foreground) / 0.1)",
        nav: "0 1px 0 hsl(var(--foreground) / 0.06), 0 12px 32px -12px hsl(var(--glow-primary) / 0.12)",
        glow: "0 0 32px -8px hsl(var(--accent) / 0.28)",
        "glow-sm": "0 0 20px -10px hsl(var(--accent) / 0.2)",
        premium:
          "0 0 0 1px hsl(var(--border) / 0.55), 0 4px 24px -8px hsl(var(--background) / 0.75), 0 0 48px -20px hsl(var(--accent) / 0.1)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-wiki)", "Georgia", "Times New Roman", "Times", "serif"],
        wiki: ["var(--font-wiki)", "Georgia", "Times New Roman", "Times", "serif"],
      },
      transitionDuration: {
        250: "250ms",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          surface: "hsl(var(--brand-surface) / <alpha-value>)",
          "surface-dark": "hsl(var(--brand-surface-dark) / <alpha-value>)",
          on: "hsl(var(--on-brand) / <alpha-value>)",
        },
        category: {
          culto: "hsl(var(--category-culto) / <alpha-value>)",
          estudo: "hsl(var(--category-estudo) / <alpha-value>)",
          jovens: "hsl(var(--category-jovens) / <alpha-value>)",
          mulheres: "hsl(var(--category-mulheres) / <alpha-value>)",
          homens: "hsl(var(--category-homens) / <alpha-value>)",
          criancas: "hsl(var(--category-criancas) / <alpha-value>)",
          especial: "hsl(var(--category-especial) / <alpha-value>)",
          conferencia: "hsl(var(--category-conferencia) / <alpha-value>)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "aurora-drift": {
          "0%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(2%, -1.5%) scale(1.03)" },
          "100%": { transform: "translate(-1.5%, 2%) scale(1.05)" },
        },
        "glow-float": {
          "0%, 100%": { opacity: "0.45", transform: "translateY(0)" },
          "50%": { opacity: "0.7", transform: "translateY(-8px)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "aurora-drift": "aurora-drift 28s ease-in-out infinite alternate",
        "glow-float": "glow-float 12s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.7s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
