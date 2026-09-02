import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Paper to Colab — Research Paper → Google Colab Notebook",
  description:
    "Upload a research paper PDF and instantly generate a production-quality Google Colab notebook implementing the paper's algorithms as a tutorial.",
};

// Inline script runs synchronously before React hydrates to prevent
// a flash of the wrong theme (FOUC).
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = (stored === 'light' || stored === 'dark')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore: inline theme script must run before hydration to prevent FOUC */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-background text-highlight antialiased min-h-screen">
        <Header />
        {children}
      </body>
    </html>
  );
}
