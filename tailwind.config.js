/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'garmin-blue': '#007cc3',
                'garmin-dark': '#1a1a1c',
                'strava-orange': '#fc4c02',
                background: '#0a0a0b',
                surface: '#18181b',
                border: '#27272a',
            }
        },
    },
    plugins: [],
}
