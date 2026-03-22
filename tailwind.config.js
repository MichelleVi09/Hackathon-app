/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Averia Sans Libre'", "ui-sans-serif", "system-ui"],
        body: ["'Nunito'", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        glow: "0 20px 60px rgba(34, 34, 34, 0.12)"
      }
    }
  },
  plugins: []
};
