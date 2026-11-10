import type { Metadata } from "next"

export const metadata: Metadata = { title: "Terms · Glyphswap" }

export default function Terms() {
  return (
    <>
      <h1>Terms of use</h1>
      <p>Last updated 10 November 2026. By using Glyphswap you agree to these terms.</p>
      <h2>Acceptable use</h2>
      <p>
        You may only edit images you own or have the right to modify. You must not use Glyphswap to:
      </p>
      <ul>
        <li>forge or alter identity documents, passports, licenses or permits;</li>
        <li>forge or alter certificates, diplomas, transcripts or awards;</li>
        <li>forge or alter invoices, receipts, bank statements or financial records;</li>
        <li>forge or alter any official, legal, medical or government document;</li>
        <li>deceive, defraud or impersonate any person or organization;</li>
        <li>infringe copyright, trademarks or other rights of others.</li>
      </ul>
      <p>We may suspend accounts and keep records needed to report abuse to the authorities.</p>
      <h2>Credits</h2>
      <p>
        Credits have no cash value. One credit processes one image. Failed jobs are refunded
        automatically.
      </p>
      <h2>Your content</h2>
      <p>
        You keep all rights to the images you upload and the results you create. We process them
        only to provide the service.
      </p>
      <h2>No warranty</h2>
      <p>
        The service is provided as is, without warranties of any kind. Glyphswap is not liable for
        any damages arising from its use.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms. Continued use after an update means you accept the new terms.
      </p>
    </>
  )
}
