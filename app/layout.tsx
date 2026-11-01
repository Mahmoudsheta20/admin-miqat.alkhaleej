import { localizedMetadataTitle } from "@/lib/metadata";
import { cookies } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/themeContext";
import { AuthProvider } from "@/lib/authContext";
import { LanguageProvider } from "@/lib/languageContext";
import { Zain, Inter } from "next/font/google";

const zain = Zain({
  weight: ["200", "300", "400", "700", "800", "900"],
  subsets: ["arabic", "latin"],
  variable: "--font-zain",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
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
      className={`h-full antialiased ${zain.variable} ${inter.variable}`}
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
