import { useState, useEffect, useContext, createContext } from "react";

const ThemeContext = createContext("light");

export function ThemeProvider({ theme, children }) {
  const [currentTheme, setTheme] = useState(theme || global.window?.__theme || "light");
  const toggleTheme = () => {
    global.window.__setPreferredTheme(currentTheme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    global.window.__onThemeChange = setTheme;
  }, []);

  return (
    <ThemeContext.Provider value={{ currentTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);