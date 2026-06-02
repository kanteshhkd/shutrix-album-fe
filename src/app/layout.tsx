import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Shutrix Album Studio — Cinematic Wedding Album Design',
  description: 'Professional wedding album design platform for Indian photographers. Create stunning cinematic albums with ease.',
  keywords: ['wedding album', 'photography', 'album design', 'Indian wedding', 'photo book'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfairDisplay.variable} dark`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
