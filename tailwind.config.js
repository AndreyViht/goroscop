module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pink: "#F539F8",
        purple: "#5356FB",
        "light-gray": "#E5E5E5",
        "thin-light-gray": "#858D98",
        "dark-gray": "#374557",
        "lighter-gray": "#878F9A",
        "light-purple": "#E3E4FE",
        gold: "#F2994A",
        "light-green": "#27AE60",
        "light-red": "#EB5757",
        "white-opacity": "#7B7EFC",
        "dark-white":"#1D1F2F",
        "dark-light-purple":"#5356fb29"
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
