import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
				/* Canvas, surfaces and ink */
				canvas: 'hsl(var(--canvas) / <alpha-value>)',
				'canvas-deep': 'hsl(var(--canvas-deep) / <alpha-value>)',
				surface: 'hsl(var(--surface) / <alpha-value>)',
				ink: 'hsl(var(--ink) / <alpha-value>)',
				line: 'hsl(var(--line) / <alpha-value>)',
				primary: {
					DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
					foreground: 'hsl(var(--primary-foreground))'
				},
				brand: {
					DEFAULT: 'hsl(var(--brand) / <alpha-value>)',
					deep: 'hsl(var(--brand-deep) / <alpha-value>)'
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
				peach: {
					DEFAULT: 'hsl(var(--peach))',
					foreground: 'hsl(var(--peach-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				/* Semantic states: tone + soft surface, always with an icon */
				supported: {
					DEFAULT: 'hsl(var(--supported) / <alpha-value>)',
					soft: 'hsl(var(--supported-soft) / <alpha-value>)'
				},
				uncertain: {
					DEFAULT: 'hsl(var(--uncertain) / <alpha-value>)',
					soft: 'hsl(var(--uncertain-soft) / <alpha-value>)'
				},
				conflicting: {
					DEFAULT: 'hsl(var(--conflicting) / <alpha-value>)',
					soft: 'hsl(var(--conflicting-soft) / <alpha-value>)'
				},
				interview: {
					DEFAULT: 'hsl(var(--interview) / <alpha-value>)',
					soft: 'hsl(var(--interview-soft) / <alpha-value>)'
				},
				/* Priority: Essential or Desirable */
				essential: {
					DEFAULT: 'hsl(var(--essential) / <alpha-value>)',
					soft: 'hsl(var(--essential-soft) / <alpha-value>)'
				},
				desirable: {
					DEFAULT: 'hsl(var(--desirable) / <alpha-value>)',
					soft: 'hsl(var(--desirable-soft) / <alpha-value>)'
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
				}
			},
			borderRadius: {
				sm: '2px',
				DEFAULT: '3px',
				md: '4px',
				lg: '4px',
				xl: '6px',
				'2xl': '8px',
				'3xl': '12px',
			},
			fontFamily: {
				sans: [
					'"Instrument Sans Variable"',
					'ui-sans-serif',
					'system-ui',
					'Helvetica',
					'Arial',
					'sans-serif'
				],
				serif: [
					'"Fraunces Variable"',
					'Georgia',
					'"Times New Roman"',
					'serif'
				],
				mono: [
					'"IBM Plex Mono"',
					'ui-monospace',
					'SFMono-Regular',
					'monospace'
				]
			},
			fontSize: {
				'2xs': ['0.6875rem', { lineHeight: '1.45' }],
			},
			boxShadow: {
				card: 'var(--shadow-card)',
				lift: 'var(--shadow-lift)',
				pop: 'var(--shadow-pop)'
			},
			backgroundImage: {
				'canvas-grain':
					'radial-gradient(hsl(23 26% 86% / 0.55) 1px, transparent 1px)'
			},
			backgroundSize: {
				'canvas-grain': '18px 18px'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
