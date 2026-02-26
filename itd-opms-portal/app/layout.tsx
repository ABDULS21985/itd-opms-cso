import type { Metadata } from "next";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ITD-OPMS | CBN IT Operations & Project Management",
  description:
    "Central Bank of Nigeria — Information Technology Department. Operations and Project Management System for governance, service management, asset tracking, and strategic planning.",
  keywords: [
    "CBN",
    "Central Bank of Nigeria",
    "OPMS",
    "IT Operations",
    "Project Management",
    "ITSM",
    "Governance",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent theme flash — reads stored preference before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("opms-theme");if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.setAttribute("data-theme","dark")}}catch(e){}})();`,
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
              {children}
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
