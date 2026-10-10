/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Corporativa NODO Healthcare & HRMS Enterprise
        primary: {
          DEFAULT: '#2563eb', // Royal Blue institucional
          navy: '#0f172a',    // Deep Navy / Slate 900
          dark: '#1d4ed8',    // Blue 700
          light: '#3b82f6',   // Blue 500
          subtle: '#eff6ff',  // Blue 50
        },
        secondary: {
          DEFAULT: '#0f172a', // Slate 900 corporativo para textos y jerarquías
          dark: '#020617',    // Slate 950
          light: '#334155',   // Slate 700
          muted: '#64748b',   // Slate 500
        },
        surface: {
          DEFAULT: '#ffffff', // Tarjetas blancas puras
          ground: '#f8fafc',  // Fondo gris perla (Slate 50) para reducir fatiga visual
          subtle: '#f1f5f9',  // Slate 100 para divisores y tablas
          hover: '#f8fafc',
        },
        border: {
          DEFAULT: '#e2e8f0', // Slate 200 para bordes finos
          subtle: '#f1f5f9',  // Slate 100
          strong: '#cbd5e1',  // Slate 300
        },
        // Acentos Semánticos para Salud y Asistencia
        success: {
          DEFAULT: '#10b981', // Verde Esmeralda (Éxito, Presente)
          subtle: '#ecfdf5',  // Emerald 50
          border: '#a7f3d0',  // Emerald 200
          text: '#047857',    // Emerald 700
        },
        warning: {
          DEFAULT: '#f59e0b', // Ámbar Institucional (Retrasos, Advertencia)
          subtle: '#fffbeb',  // Amber 50
          border: '#fde68a',  // Amber 200
          text: '#b45309',    // Amber 700
        },
        danger: {
          DEFAULT: '#ef4444', // Rojo Carmesí (Faltas graves, Ausencias)
          subtle: '#fef2f2',  // Red 50
          border: '#fecaca',  // Red 200
          text: '#b91c1c',    // Red 700
        },
        info: {
          DEFAULT: '#0284c7', // Sky 600
          subtle: '#f0f9ff',  // Sky 50
          border: '#bae6fd',  // Sky 200
          text: '#0369a1',    // Sky 700
        },
        tertiary: '#f8fafc',
        error: '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'dropdown': '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      }
    },
  },
  plugins: [],
}
