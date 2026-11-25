import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Hanken_Grotesk, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google'
import 'katex/dist/katex.min.css'
import './globals.css'
import { BRAND } from '@/lib/brand'
import { themeHeadScript } from '@/lib/theme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthHashHandler } from '@/components/auth-hash-handler'
import { NavProgress } from '@/components/nav-progress'

const hanken = Hanken_Grotesk({ variable: '--font-hanken', subsets: ['latin'] })
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'] })
// Hindi study content (components/markdown.tsx, reading variant). The latin subset keeps English words and digits
// in the same face, so mixed lines share one baseline.
const devanagari = Noto_Sans_Devanagari({ variable: '--font-devanagari', subsets: ['devanagari', 'latin'], display: 'swap' })

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${hanken.variable} ${jetbrains.variable} ${devanagari.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeHeadScript }} />
      </head>
      <body className="min-h-dvh">
        <Suspense>
          <NavProgress />
        </Suspense>
        <TooltipProvider>{children}</TooltipProvider>
        <AuthHashHandler />
      </body>
    </html>
  )
}
