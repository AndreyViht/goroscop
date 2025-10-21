import React, { useEffect, useState } from "react";
import DarkModeContext from "../Contexts/DarkModeContext";

function Default({ children }) {
  // dark mode setup
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const handleThemeSwitch = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  return (
    <>
      <DarkModeContext.Provider value={{ theme, handleThemeSwitch }}>
        {children && children}
      </DarkModeContext.Provider>
    </>
  );
}

export default Default;
