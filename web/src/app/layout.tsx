import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/lib/language-context";
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: "Sanjeevani — Evidence-Graded AYUSH, Yoga, Fitness & Nutrition",
  description:
    "Traditional wisdom, graded by evidence. Evidence-tiered herb profiles, yoga library, NIN-aligned Indian food database, safety-first calculators and a herb–medication interaction checker.",
  keywords: ["AYUSH", "Ayurveda", "Yoga", "Nutrition", "Evidence tiers", "ICMR-NIN", "Herbs", "DPDP"],
  applicationName: "Sanjeevani",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sanjeevani",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2e8" },
    { media: "(prefers-color-scheme: dark)", color: "#12211c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LanguageProvider>{children}</LanguageProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
