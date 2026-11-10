"use client"

import { useEffect, useState } from "react"

const order = ["system", "light", "dark"] as const
type Theme = (typeof order)[number]

export const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.classList.add(t)}catch(e){}`

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system")

  useEffect(() => {
    const stored = localStorage.getItem("theme")
    if (stored === "light" || stored === "dark") setTheme(stored)
  }, [])

  function cycle() {
    const nextTheme = order[(order.indexOf(theme) + 1) % order.length]!
    const root = document.documentElement
    root.classList.remove("light", "dark")
    if (nextTheme === "system") localStorage.removeItem("theme")
    else {
      root.classList.add(nextTheme)
      localStorage.setItem("theme", nextTheme)
    }
    setTheme(nextTheme)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${theme}. Switch theme`}
      title={`Theme: ${theme}`}
      className="grid size-9 place-items-center rounded-md text-muted transition-colors duration-150 ease-out hover:bg-accent-soft hover:text-text focus-visible:outline-2 focus-visible:outline-accent"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="size-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      >
        {theme === "light" && (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        )}
        {theme === "dark" && <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />}
        {theme === "system" && (
          <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
          </>
        )}
      </svg>
    </button>
  )
}
