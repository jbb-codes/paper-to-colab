import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paper to Colab — Research Paper → Google Colab Notebook",
  description:
    "Upload a research paper PDF and instantly generate a production-quality Google Colab notebook implementing the paper's algorithms as a tutorial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }}>
      <body className="bg-background text-highlight antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
