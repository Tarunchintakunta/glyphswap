"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

type KeyRow = {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsedAt: string | null
  revokedAt: string | null
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<KeyRow[]>([])
  const [name, setName] = useState("default")
  const [secret, setSecret] = useState("")
  const [notice, setNotice] = useState("")

  async function load() {
    const response = await fetch("/api/keys")
    const body = (await response.json()) as { keys?: KeyRow[] }
    setKeys(body.keys ?? [])
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <main className="flex max-w-2xl flex-col gap-4">
      <h1 className="font-display text-4xl">API keys</h1>
      <p className="text-sm text-muted">
        The secret is shown once. A revoked key stops working immediately.
      </p>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setNotice("")
          void fetch("/api/keys", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name }),
          })
            .then(async (response) => {
              const body = (await response.json()) as {
                secret?: string
                error?: { message: string }
              }
              if (!response.ok || !body.secret) {
                setNotice(body.error?.message ?? "Could not create a key")
                return
              }
              setSecret(body.secret)
              await load()
            })
            .catch(() => setNotice("Could not create a key"))
        }}
      >
        <label className="text-sm">
          Name
          <input
            className="mt-1 block rounded-md border border-border bg-surface px-2 py-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button type="submit">Create key</Button>
      </form>
      {secret ? (
        <p className="rounded-md bg-accent-soft p-3 font-mono text-sm" role="status">
          {secret}
        </p>
      ) : null}
      {notice ? <p role="alert">{notice}</p> : null}
      <ul className="flex flex-col gap-2">
        {keys.map((key) => (
          <li
            key={key.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
          >
            <div>
              <p>{key.name}</p>
              <p className="font-mono text-xs text-muted">{key.prefix}…</p>
            </div>
            {key.revokedAt ? (
              <span className="text-sm text-muted">Revoked</span>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void fetch(`/api/keys/${key.id}`, { method: "DELETE" }).then(() => load())
                }}
              >
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}
