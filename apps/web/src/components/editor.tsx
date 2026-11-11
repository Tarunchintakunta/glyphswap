"use client"

import { useRouter } from "next/navigation"
import { useEffect, useRef, useState, type PointerEvent } from "react"
import { lengthWarning } from "@/lib/edits"
import { Button } from "@/components/ui/button"

type Point = [number, number]

type Line = {
  id: string
  text: string
  polygon: Point[]
  newText: string
  fontFamily: string
  fontSize: string
  color: string
  angle: string
  removed: boolean
}

type Box = {
  id: string
  x: number
  y: number
  w: number
  h: number
  newText: string
  removed: boolean
}

type Shot = { lines: Line[]; boxes: Box[] }

const fonts = [
  "Inter",
  "Roboto",
  "OpenSans",
  "Montserrat",
  "Lato",
  "Lato-Bold",
  "Merriweather",
  "PlayfairDisplay",
  "Lora",
  "SourceCodePro",
  "BebasNeue",
  "Oswald",
  "Caveat",
  "NotoSansDevanagari",
  "NotoSansTelugu",
]

const maxBytes = 8 * 1024 * 1024

function pointsOf(line: Line) {
  return line.polygon.map((point) => point.join(",")).join(" ")
}

export function Editor({
  initial,
}: {
  initial: {
    imageId: string
    width: number
    height: number
    url: string
    lines: { id: string; text: string; polygon: Point[] }[]
  } | null
}) {
  const router = useRouter()
  const replaceAll = useRef<HTMLInputElement>(null)
  const [lang, setLang] = useState("en")
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [draw, setDraw] = useState(false)
  const [image, setImage] = useState(initial)
  const [lines, setLines] = useState<Line[]>(
    (initial?.lines ?? []).map((line) => ({
      ...line,
      newText: line.text,
      fontFamily: "",
      fontSize: "",
      color: "",
      angle: "",
      removed: false,
    })),
  )
  const [boxes, setBoxes] = useState<Box[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const past = useRef<Shot[]>([])
  const drag = useRef<{ x: number; y: number; id: string } | null>(null)
  const corner = useRef<{ id: string; index: number } | null>(null)
  const linesRef = useRef(lines)
  const boxesRef = useRef(boxes)
  const selectedRef = useRef(selected)
  linesRef.current = lines
  boxesRef.current = boxes
  selectedRef.current = selected

  function remember() {
    past.current = [...past.current, { lines, boxes }].slice(-50)
  }

  function undo() {
    const shot = past.current.pop()
    if (!shot) return
    setLines(shot.lines)
    setBoxes(shot.boxes)
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
      ) {
        return
      }
      if (event.key === "b" || event.key === "B") {
        event.preventDefault()
        setDraw(true)
      }
      if (event.key === "r" || event.key === "R") {
        event.preventDefault()
        replaceAll.current?.focus()
      }
      const currentId = selectedRef.current
      if ((event.key === "Delete" || event.key === "Backspace") && currentId) {
        event.preventDefault()
        past.current = [
          ...past.current,
          { lines: linesRef.current, boxes: boxesRef.current },
        ].slice(-50)
        setLines((current) =>
          current.map((line) =>
            line.id === currentId ? { ...line, removed: true, newText: "" } : line,
          ),
        )
        setBoxes((current) =>
          current.map((box) =>
            box.id === currentId ? { ...box, removed: true, newText: "" } : box,
          ),
        )
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault()
        const shot = past.current.pop()
        if (!shot) return
        setLines(shot.lines)
        setBoxes(shot.boxes)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  async function onFile(file: File | undefined) {
    if (!file) return
    if (file.size > maxBytes) {
      setNotice("That file is over 8 MB. Use a smaller PNG, JPEG or WebP.")
      return
    }
    setNotice("")
    setBusy(true)
    const form = new FormData()
    form.set("image", file)
    form.set("lang", lang)
    const response = await fetch("/api/images", { method: "POST", body: form })
    setBusy(false)
    const body = (await response.json()) as {
      imageId?: string
      width?: number
      height?: number
      url?: string
      lines?: { id: string; text: string; polygon: Point[] }[]
      error?: { message: string }
    }
    if (!response.ok || !body.imageId || !body.url || !body.width || !body.height) {
      setNotice(body.error?.message ?? "Upload failed")
      return
    }
    setImage({
      imageId: body.imageId,
      width: body.width,
      height: body.height,
      url: body.url,
      lines: body.lines ?? [],
    })
    setLines(
      (body.lines ?? []).map((line) => ({
        ...line,
        newText: line.text,
        fontFamily: "",
        fontSize: "",
        color: "",
        angle: "",
        removed: false,
      })),
    )
    setBoxes([])
    past.current = []
    router.replace(`/app?image=${body.imageId}`)
  }

  function localPoint(event: PointerEvent<SVGSVGElement>) {
    if (!image) return { x: 0, y: 0 }
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * image.width,
      y: ((event.clientY - rect.top) / rect.height) * image.height,
    }
  }

  async function submit() {
    if (!image) return
    const edits = [
      ...lines.flatMap((line) => {
        const changed =
          line.removed ||
          line.newText !== line.text ||
          line.fontFamily ||
          line.fontSize ||
          line.color ||
          line.angle
        if (!changed) return []
        return [
          {
            line_id: line.id,
            new_text: line.removed ? "" : line.newText,
            remove: line.removed || line.newText.trim() === "",
            ...(line.fontFamily ? { font_family: line.fontFamily } : {}),
            ...(line.fontSize ? { font_size: Number(line.fontSize) } : {}),
            ...(line.color ? { color: line.color } : {}),
            ...(line.angle ? { angle: Number(line.angle) } : {}),
          },
        ]
      }),
      ...boxes.flatMap((box) => {
        if (box.w < 2 || box.h < 2) return []
        return [
          {
            box: [Math.round(box.x), Math.round(box.y), Math.round(box.w), Math.round(box.h)] as [
              number,
              number,
              number,
              number,
            ],
            new_text: box.removed ? "" : box.newText,
            remove: box.removed || box.newText.trim() === "",
          },
        ]
      }),
    ]
    if (!edits.length) {
      setNotice("Change a line, or draw a box, before running the edit.")
      return
    }
    setBusy(true)
    setNotice("")
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image_id: image.imageId, edits, results: ["B", "C"], lang }),
    })
    setBusy(false)
    const body = (await response.json()) as { job_id?: string; error?: { message: string } }
    if (!response.ok || !body.job_id) {
      setNotice(body.error?.message ?? "Edit failed")
      return
    }
    router.push(`/app/jobs/${body.job_id}`)
    router.refresh()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm">
            Language
            <select
              className="ml-2 rounded-md border border-border bg-surface px-2 py-1"
              value={lang}
              onChange={(event) => setLang(event.target.value)}
            >
              <option value="en">English</option>
              <option value="latin">Latin</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
            </select>
          </label>
          <Button
            type="button"
            variant={draw ? "accent" : "outline"}
            onClick={() => setDraw((value) => !value)}
          >
            Draw box
          </Button>
          <Button type="button" variant="outline" onClick={undo}>
            Undo
          </Button>
          <Button type="button" disabled={!image || busy} onClick={() => void submit()}>
            {busy ? "Working…" : "Run edit"}
          </Button>
        </div>
        <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-surface p-4 text-center">
          <span>Drop a PNG, JPEG or WebP up to 8 MB</span>
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
        </label>
        {notice ? (
          <p role="status" className="text-sm text-accent">
            {notice}
          </p>
        ) : null}
        {image ? (
          <div className="overflow-auto rounded-lg border border-border bg-surface">
            <svg
              viewBox={`0 0 ${image.width} ${image.height}`}
              className="h-auto w-full"
              onPointerDown={(event) => {
                if (!draw) return
                const point = localPoint(event)
                const id = `box-${boxes.length + 1}`
                remember()
                drag.current = { x: point.x, y: point.y, id }
                setBoxes((current) => [
                  ...current,
                  { id, x: point.x, y: point.y, w: 1, h: 1, newText: "", removed: false },
                ])
                setSelected(id)
              }}
              onPointerMove={(event) => {
                const point = localPoint(event)
                if (corner.current) {
                  const active = corner.current
                  setLines((current) =>
                    current.map((line) => {
                      if (line.id !== active.id) return line
                      const polygon = line.polygon.map((item, index) =>
                        index === active.index ? ([point.x, point.y] as Point) : item,
                      )
                      return { ...line, polygon }
                    }),
                  )
                }
                if (!drag.current) return
                const origin = drag.current
                setBoxes((current) =>
                  current.map((box) =>
                    box.id === origin.id
                      ? {
                          ...box,
                          x: Math.min(origin.x, point.x),
                          y: Math.min(origin.y, point.y),
                          w: Math.abs(point.x - origin.x),
                          h: Math.abs(point.y - origin.y),
                        }
                      : box,
                  ),
                )
              }}
              onPointerUp={() => {
                drag.current = null
                corner.current = null
                setDraw(false)
              }}
            >
              <image href={image.url} width={image.width} height={image.height} />
              {lines.map((line) => (
                <polygon
                  key={line.id}
                  points={pointsOf(line)}
                  fill={line.removed ? "rgba(180,40,40,0.25)" : "transparent"}
                  stroke={selected === line.id ? "rgb(20,90,70)" : "rgb(40,40,40)"}
                  strokeWidth={2}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    setSelected(line.id)
                  }}
                />
              ))}
              {lines
                .filter((line) => line.id === selected)
                .flatMap((line) =>
                  line.polygon.map((point, index) => (
                    <circle
                      key={`${line.id}-${index}`}
                      cx={point[0]}
                      cy={point[1]}
                      r={6}
                      fill="white"
                      stroke="black"
                      onPointerDown={(event) => {
                        event.stopPropagation()
                        remember()
                        corner.current = { id: line.id, index }
                      }}
                    />
                  )),
                )}
              {boxes.map((box) => (
                <rect
                  key={box.id}
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={box.h}
                  fill="transparent"
                  stroke="rgb(20,90,70)"
                  strokeWidth={2}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    setSelected(box.id)
                  }}
                />
              ))}
            </svg>
          </div>
        ) : null}
      </section>
      <aside className="flex flex-col gap-3">
        <label className="text-sm">
          Replace all
          <input
            ref={replaceAll}
            className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1"
            placeholder="New text for every line"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              const value = event.currentTarget.value
              remember()
              setLines((current) =>
                current.map((line) => ({ ...line, newText: value, removed: value.trim() === "" })),
              )
            }}
          />
        </label>
        <ul className="flex max-h-[70dvh] flex-col gap-3 overflow-auto">
          {lines.map((line) => {
            const warn = !line.removed && lengthWarning(line.text, line.newText)
            return (
              <li key={line.id} className="rounded-md border border-border p-2">
                <button
                  type="button"
                  className="text-left text-sm text-muted"
                  onClick={() => setSelected(line.id)}
                >
                  {line.text}
                </button>
                <input
                  aria-label={`Replacement for ${line.text}`}
                  className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1"
                  value={line.newText}
                  onChange={(event) => {
                    const value = event.target.value
                    setLines((current) =>
                      current.map((item) =>
                        item.id === line.id ? { ...item, newText: value, removed: false } : item,
                      ),
                    )
                  }}
                />
                {warn ? (
                  <p className="mt-1 text-xs text-accent">Much longer than the original line.</p>
                ) : null}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input
                    list="glyph-fonts"
                    aria-label="Font"
                    placeholder="Font"
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                    value={line.fontFamily}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.id === line.id ? { ...item, fontFamily: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="Size"
                    placeholder="Size"
                    inputMode="decimal"
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                    value={line.fontSize}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.id === line.id ? { ...item, fontSize: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="Color"
                    placeholder="#112233"
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                    value={line.color}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.id === line.id ? { ...item, color: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="Angle"
                    placeholder="Angle"
                    className="rounded-md border border-border bg-surface px-2 py-1 text-sm"
                    value={line.angle}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item) =>
                          item.id === line.id ? { ...item, angle: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              </li>
            )
          })}
          {boxes.map((box) => (
            <li key={box.id} className="rounded-md border border-border p-2">
              <p className="text-sm text-muted">Drawn box {box.id}</p>
              <input
                aria-label={`Text for ${box.id}`}
                className="mt-1 w-full rounded-md border border-border bg-surface px-2 py-1"
                value={box.newText}
                onChange={(event) =>
                  setBoxes((current) =>
                    current.map((item) =>
                      item.id === box.id ? { ...item, newText: event.target.value } : item,
                    ),
                  )
                }
              />
            </li>
          ))}
        </ul>
        <datalist id="glyph-fonts">
          {fonts.map((font) => (
            <option key={font} value={font} />
          ))}
        </datalist>
      </aside>
    </div>
  )
}
