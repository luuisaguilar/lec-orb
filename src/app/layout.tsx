import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LEC Platform",
  description:
    "Language Evaluation Center — Plataforma unificada para inventario, eventos, nómina y más.",
  icons: {
    icon: [
      { url: "/lec_logo_pack/icon_square_16.png", sizes: "16x16", type: "image/png" },
      { url: "/lec_logo_pack/icon_square_32.png", sizes: "32x32", type: "image/png" },
      { url: "/lec_logo_pack/icon_square_48.png", sizes: "48x48", type: "image/png" },
      { url: "/lec_logo_pack/icon_square_96.png", sizes: "96x96", type: "image/png" },
      { url: "/lec_logo_pack/icon_square_192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/lec_logo_pack/icon_square_180.png",
    shortcut: "/lec_logo_pack/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
