"use client"

import { useState, type ReactNode } from "react"

export function BeforeAfter({ before, after }: { before: ReactNode; after: ReactNode }) {
  const [position, setPosition] = useState(50)
  return (
    <div className="relative aspect-[8/5] w-full select-none overflow-hidden rounded-lg border border-border bg-surface shadow-[0_24px_64px_-24px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-0">{after}</div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        {before}
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-sm bg-black/60 px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-white">
        Before
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-sm bg-accent px-2 py-1 font-mono text-[11px] uppercase tracking-widest text-on-accent">
        After
      </span>
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)]"
        style={{ left: `${position}%` }}
      >
        <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#111] shadow-md">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 6-6 6 6 6M15 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => setPosition(Number(e.target.value))}
        aria-label="Compare before and after"
        className="peer absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
      <div className="pointer-events-none absolute inset-0 rounded-lg ring-accent peer-focus-visible:ring-2" />
    </div>
  )
}
