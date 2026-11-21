import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Squishy Dashboard',
  description: 'Owner dashboard for Squishy Jiggly Pals: players, levels, jellies and Rush scores.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
