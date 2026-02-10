/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#009688', // Teal
                secondary: '#26a69a',
                accent: '#80cbc4',
            },
        },
    },
    plugins: [],
}
