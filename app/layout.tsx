import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kode Analytics',
  description: 'Kode Aggregation Analysis Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
