import type { EditItem } from "@glyphswap/shared"

export type SourceLine = {
  id: string
  text: string
  polygon: [number, number][]
  angle: number
  confidence: number
}

export type ResolvedEdit = {
  lineId: string | null
  box: [number, number, number, number] | null
  polygon: [number, number][]
  oldText: string | null
  newText: string
  remove: boolean
  fontFamily: string | null
  fontSize: number | null
  color: string | null
  angle: number | null
}

export type EditFailure = {
  ok: false
  status: number
  code: string
  message: string
  details?: unknown
}

function styleOf(edit: EditItem) {
  return {
    fontFamily: "font_family" in edit ? (edit.font_family ?? null) : null,
    fontSize: "font_size" in edit ? (edit.font_size ?? null) : null,
    color: "color" in edit ? (edit.color ?? null) : null,
    angle: "angle" in edit ? (edit.angle ?? null) : null,
  }
}

function boxPolygon(value: [number, number, number, number]): [number, number][] {
  const [x, y, w, h] = value
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
}

function fromLine(
  line: SourceLine,
  newText: string,
  remove: boolean,
  edit: EditItem,
): ResolvedEdit {
  return {
    lineId: line.id,
    box: null,
    polygon: line.polygon,
    oldText: line.text,
    newText: remove ? "" : newText,
    remove,
    ...styleOf(edit),
  }
}

export function resolveEdits(
  lines: SourceLine[],
  edits: EditItem[],
  cap: number,
): { ok: true; edits: ResolvedEdit[] } | EditFailure {
  if (edits.length > cap) {
    return { ok: false, status: 400, code: "invalid_request", message: `At most ${cap} edits` }
  }
  const resolved: ResolvedEdit[] = []
  for (const edit of edits) {
    if ("old_text" in edit) {
      const needle = edit.old_text.trim().toLowerCase()
      const hits = lines.filter((line) => line.text.trim().toLowerCase() === needle)
      if (hits.length === 0) {
        return {
          ok: false,
          status: 422,
          code: "text_not_found",
          message: `No line matches ${edit.old_text}`,
          details: { lines: lines.map((line) => ({ id: line.id, text: line.text })) },
        }
      }
      const chosen = edit.match === "first" ? hits.slice(0, 1) : hits
      const remove = edit.new_text.trim() === ""
      for (const line of chosen) resolved.push(fromLine(line, edit.new_text, remove, edit))
      continue
    }
    if ("line_id" in edit) {
      const line = lines.find((item) => item.id === edit.line_id)
      if (!line) {
        return {
          ok: false,
          status: 422,
          code: "text_not_found",
          message: "line_id is not on this image",
          details: { lines: lines.map((item) => ({ id: item.id, text: item.text })) },
        }
      }
      const remove = edit.remove === true || (edit.new_text ?? "").trim() === ""
      if (!remove && edit.new_text === undefined) {
        return {
          ok: false,
          status: 400,
          code: "invalid_request",
          message: "new_text or remove is required",
        }
      }
      resolved.push(fromLine(line, edit.new_text ?? "", remove, edit))
      continue
    }
    const remove = edit.remove === true || (edit.new_text ?? "").trim() === ""
    if (!remove && edit.new_text === undefined) {
      return {
        ok: false,
        status: 400,
        code: "invalid_request",
        message: "new_text or remove is required",
      }
    }
    resolved.push({
      lineId: null,
      box: edit.box,
      polygon: boxPolygon(edit.box),
      oldText: null,
      newText: remove ? "" : (edit.new_text ?? ""),
      remove,
      ...styleOf(edit),
    })
  }
  if (resolved.length === 0) {
    return { ok: false, status: 400, code: "invalid_request", message: "No edits to apply" }
  }
  return { ok: true, edits: resolved }
}

export function lengthWarning(oldText: string, newText: string) {
  return newText.length > oldText.length * 2 && newText.length - oldText.length >= 6
}
