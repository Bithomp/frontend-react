import { useState, useEffect } from "react"
import { useTheme } from "../ThemeContext"
import Image from 'next/image'

export default function Switch() {
  const [mount, setMount] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setMount(true);
  }, []);

  if (!mount) return null;

  return (
    <div className="theme-switch">
      <div className={`switch-container ${theme}`} onClick={toggleTheme}>
        <Image src="/images/sun.svg" className="switch-icon sun" alt="light mode" height={15} width={15} />
        <Image src="/images/moon.svg" className="switch-icon moon" alt="dark mode" height={15} width={15} />
      </div>
    </div>
  );
};
