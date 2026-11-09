import { localizedMetadataTitle } from "@/lib/metadata";
import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/themeContext";
import { AuthProvider } from "@/lib/authContext";
import { LanguageProvider } from "@/lib/languageContext";
import localFont from "next/font/local";

const arabicFont = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", weight: "500" },
    { path: "./fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", weight: "600" },
    { path: "./fonts/ibm-plex-sans-arabic-arabic-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-arabic-face", display: "swap", preload: true,
});
const latinFont = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/inter-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-latin-face", display: "swap", preload: true,
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#070b12" },
  ],
};

export async function generateMetadata():Promise<Metadata> { return {
  title: await localizedMetadataTitle("نظام ميقات الخليج لإدارة الأسطول والرحلات | Miqat Operations"),
  description:
    await localizedMetadataTitle("نظام إدارة الأسطول والسائقين والرحلات وإصدار العقود الرسمية - شركة ميقات الخليج للنقل البري"),
  icons: {
    icon: "/logo.svg",
  },
}; }

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const preferences=await cookies();
  const initialLanguage=preferences.get("miqat_language")?.value === "en" ? "en" : "ar";
  return (
    <html
      lang={initialLanguage}
      dir={initialLanguage === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      className={`h-full antialiased ${arabicFont.variable} ${latinFont.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const savedTheme = localStorage.getItem('miqat_theme');
                if (savedTheme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
                const savedLang = (localStorage.getItem('miqat_language') || '${initialLanguage}') === 'en' ? 'en' : 'ar';
                document.documentElement.lang = savedLang;
                document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr';
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full">
        <LanguageProvider initialLanguage={initialLanguage}>
          <ThemeProvider>
            <AuthProvider>{children}</AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
