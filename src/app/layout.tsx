import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "./actions";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ata Conselho IFPI",
  description: "Gerenciamento de Conselho de Classe e geração de atas."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <div className="min-h-screen bg-background text-foreground">
          <header className="border-b border-border bg-card">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-lg font-bold text-primary">
                Ata Conselho IFPI
              </Link>
              {user ? (
                <nav className="flex items-center gap-4 text-sm">
                  <Link href="/" className="font-medium text-muted-foreground hover:text-primary">
                    Reuniões
                  </Link>
                  <Link href="/cadastros" className="font-medium text-muted-foreground hover:text-primary">
                    Cadastros
                  </Link>
                  <span className="text-muted-foreground">{user.name}</span>
                  <ThemeToggle />
                  <form action={logoutAction}>
                    <button className="rounded-md border border-input px-3 py-2 text-sm font-semibold hover:bg-accent">
                      Sair
                    </button>
                  </form>
                </nav>
              ) : (
                <ThemeToggle />
              )}
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
