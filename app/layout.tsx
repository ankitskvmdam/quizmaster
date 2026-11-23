import type { Metadata } from 'next'
import { Hanken_Grotesk, JetBrains_Mono } from 'next/font/google'
import 'katex/dist/katex.min.css'
import './globals.css'
import { BRAND } from '@/lib/brand'
import { themeHeadScript } from '@/lib/theme'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthHashHandler } from '@/components/auth-hash-handler'

const hanken = Hanken_Grotesk({ variable: '--font-hanken', subsets: ['latin'] })
const jetbrains = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${hanken.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeHeadScript }} />
      </head>
      <body className="min-h-dvh">
        <TooltipProvider>{children}</TooltipProvider>
        <AuthHashHandler />
      </body>
    </html>
  )
}
