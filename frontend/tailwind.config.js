/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#26C6DA', // Medicate Cyan
                secondary: '#4DD0E1',
                accent: '#00BCD4',
                // Override default teal to remove green tint
                teal: {
                    50: '#E0F7FA', // Very light cyan bg
                    100: '#B2EBF2',
                    200: '#80DEEA',
                    300: '#4DD0E1',
                    400: '#26C6DA', // Main brand color (replacing teal-400)
                    500: '#00BCD4',
                    600: '#00ACC1', // Primary buttons (replacing teal-600) - looks cyan/blue
                    700: '#0097A7',
                    800: '#00838F', // Dark text (replacing teal-800)
                    900: '#006064',
                },
            },
        },
    },
    plugins: [],
}
