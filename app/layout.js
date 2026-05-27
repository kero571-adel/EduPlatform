// /app/layout.js
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthSync from "@/components/AuthSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "EduPlatform - Online Learning",
    template: "%s | EduPlatform"
  },
  description: "Interactive online learning platform for teachers and students. Create exams, watch lectures, and track progress.",
  keywords: ["education", "online learning", "exams", "lectures", "e-learning", "teachers", "students"],
  authors: [{ name: "Your Name" }],
  creator: "Your Name",
  publisher: "EduPlatform",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://yourdomain.com",
    siteName: "EduPlatform",
    title: "EduPlatform - Online Learning",
    description: "Interactive online learning platform for teachers and students.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "EduPlatform" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "EduPlatform - Online Learning",
    description: "Interactive online learning platform for teachers and students.",
    images: ["/og-image.png"]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ]
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://firebase.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AuthSync />
        {children}
        <div id="toast-root" className="fixed bottom-4 right-4 z-50 pointer-events-none" />
        <div id="nprogress" className="fixed top-0 left-0 right-0 h-0.5 z-50" />
      </body>
    </html>
  );
}