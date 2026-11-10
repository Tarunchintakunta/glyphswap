import Link from "next/link"

export function Logo() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <span
        aria-hidden
        className="grid size-7 place-items-center rounded-sm bg-accent font-display text-lg italic leading-none text-white"
      >
        G
      </span>
      <span className="font-display text-2xl leading-none">Glyphswap</span>
    </Link>
  )
}
