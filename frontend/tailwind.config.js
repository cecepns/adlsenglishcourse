export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          DEFAULT: "#2a5885",
          dark: "#1e3a5f",
          light: "#c8d0da",
        },
      },
    },
  },
  plugins: [],
};
