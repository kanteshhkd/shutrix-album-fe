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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* All editor fonts — script, serif, sans-serif, display */}
        <link
          href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@400;700&family=Pinyon+Script&family=Alex+Brush&family=Allura&family=Satisfy&family=Sacramento&family=Kaushan+Script&family=Rouge+Script&family=Pacifico&family=Cormorant+Garamond:wght@300;400;600;700&family=Cinzel:wght@400;700;900&family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Libre+Baskerville:wght@400;700&family=Lora:wght@400;700&family=Crimson+Text:wght@400;700&family=Gilda+Display&family=Bodoni+Moda:wght@400;700&family=Cardo:wght@400;700&family=Raleway:wght@100;200;300;400;500;600;700;800;900&family=Montserrat:wght@100;200;300;400;500;600;700;800;900&family=Josefin+Sans:wght@100;300;400;600;700&family=Nunito:wght@300;400;600;700;800&family=Poppins:wght@100;200;300;400;500;600;700;800;900&family=Lato:wght@100;300;400;700;900&family=Work+Sans:wght@100;200;300;400;500;600;700;800;900&family=Quicksand:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;600;700;800&family=Abril+Fatface&family=Bebas+Neue&family=Oswald:wght@200;300;400;500;600;700&family=Righteous&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
