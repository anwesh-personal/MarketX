import './globals.css'
import { Inter, Playfair_Display, Space_Grotesk, DM_Sans, Fira_Code, JetBrains_Mono, IBM_Plex_Mono, Bricolage_Grotesque, Instrument_Sans } from 'next/font/google'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--loaded-inter' })
const playfairDisplay = Playfair_Display({ subsets: ['latin'], display: 'swap', variable: '--loaded-playfair' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], display: 'swap', variable: '--loaded-space-grotesk' })
const dmSans = DM_Sans({ subsets: ['latin'], display: 'swap', variable: '--loaded-dm-sans' })
const firaCode = Fira_Code({ subsets: ['latin'], display: 'swap', variable: '--loaded-fira-code' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--loaded-jetbrains' })
const ibmPlexMono = IBM_Plex_Mono({ weight: ['400', '500', '600'], subsets: ['latin'], display: 'swap', variable: '--loaded-ibm-plex' })
const bricolageGrotesque = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--loaded-bricolage' })
const instrumentSans = Instrument_Sans({ subsets: ['latin'], display: 'swap', variable: '--loaded-instrument-sans' })

const fontVariables = [
    inter.variable,
    playfairDisplay.variable,
    spaceGrotesk.variable,
    dmSans.variable,
    firaCode.variable,
    jetbrainsMono.variable,
    ibmPlexMono.variable,
    bricolageGrotesque.variable,
    instrumentSans.variable,
].join(' ')

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('marketx-theme');
    if (t && /^(obsidian|aurora|ember|arctic|velvet)-(day|night)$/.test(t)) {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      var m = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
      document.documentElement.setAttribute('data-theme', 'arctic-' + m);
    }
  } catch(e) {
    document.documentElement.setAttribute('data-theme', 'arctic-day');
  }
})();
`

export const metadata = {
    title: 'MarketX — AI-Powered Marketing Intelligence',
    description: 'Intelligent content creation with self-improving knowledge base',
    icons: {
        icon: '/favicon.png',
        apple: '/favicon.png',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={fontVariables} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: themeScript }} />
                <link rel="preconnect" href="https://api.fontshare.com" crossOrigin="anonymous" />
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,600,700&f[]=clash-display@400,500,600,700&f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet" />
                <link href="https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-mono/style.css" rel="stylesheet" />
                <link href="https://cdn.jsdelivr.net/npm/victor-mono@1.5.6/dist/index.min.css" rel="stylesheet" />
            </head>
            <body>
                <ThemeProvider>
                    {children}
                    <Toaster position="top-right" />
                </ThemeProvider>
            </body>
        </html>
    )
}
