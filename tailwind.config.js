/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}",
    ],
    theme: {
        extend: {
            colors: {
                'primary-dark': '#0f172a',
                'primary-medium': '#0f172a',
            },
        },
    },
    plugins: [],
}