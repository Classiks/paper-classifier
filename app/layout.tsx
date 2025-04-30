import HeaderBar from "@/components/layout/headerbar";
import "./globals.css";
import ThemeProvider from "@/components/providers/theme";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <HeaderBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
