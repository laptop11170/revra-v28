import type { Metadata } from "next";
import { Geist, Geist_Mono, Audiowide } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/context/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { CommandPaletteTrigger } from "@/components/layouts/CommandPalette";
import { LeadProfileProvider } from "@/context/lead-profile-context";
import { LeadProfileSlideOver } from "@/components/lead-profile/LeadProfileSlideOver";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const audiowide = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-audiowide",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RevRa — AI-Powered Insurance CRM",
  description: "Manage leads, calls, texts, and AI — all in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ""}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geist.variable} ${geistMono.variable} ${audiowide.variable} antialiased`}
        >
          <ThemeProvider>
            <ToastProvider>
              <CommandPaletteTrigger>
                <LeadProfileProvider>
                  {children}
                  <LeadProfileSlideOver />
                </LeadProfileProvider>
              </CommandPaletteTrigger>
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}