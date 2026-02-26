import type { Metadata } from "next";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "African Tech Talent Portal - Tech Talent Marketplace",
  description:
    "Connect top tech talent with leading employers. African Tech Talent Portal is a curated marketplace for discovering, evaluating, and hiring emerging professionals across Africa.",
  keywords: [
    "african tech talent",
    "talent marketplace",
    "hiring platform",
    "Digibit",
    "Africa jobs",
    "employer portal",
    "candidate portal",
  ],
  openGraph: {
    title: "African Tech Talent Portal - Tech Talent Marketplace",
    description:
      "Connect top tech talent with leading employers. A curated marketplace for discovering, evaluating, and hiring emerging professionals.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("admin-theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className="min-h-screen bg-background text-foreground antialiased"
        style={{
          fontFamily:
            'Aptos, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
              <Toaster
                theme="system"
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    fontFamily: "inherit",
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
