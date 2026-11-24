import type { Metadata } from "next"
import localFont from "next/font/local"
import { ClipboardLock } from "@/components/clipboard-lock"
import "./globals.css"

const serif = localFont({
  src: [
    { path: "../public/fonts/CormorantGaramond-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/CormorantGaramond-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-cormorant",
  display: "swap",
})

const sans = localFont({
  src: [
    { path: "../public/fonts/Outfit-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/Outfit-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/Outfit-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-outfit",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Camilia University",
  description: "Push the doors of the hall, choose a chair, and read the menu on the board.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-[#140f0c] text-[#f6f0e6] select-none">
        <ClipboardLock />
        {children}
      </body>
    </html>
  )
}
