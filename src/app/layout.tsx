import '@/lib/firebase'; // Garante a inicialização do Firebase no início
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

import { Toaster } from '@/components/ui/toaster';
import { UnifiedThemeProvider } from '@/contexts/unified-theme-provider';
import PwaRegistry from './pwa-registry';
import { PermissionDialogProvider } from '@/hooks/use-permission-dialog';
import FirebaseAuthHandler from '@/components/firebase-auth-handler';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DirtyStateProvider } from '@/contexts/dirty-state-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Meu orçamento',
  description: 'Gere orçamentos de serviços de forma rápida, precisa e profissional.',
  manifest: '/manifest.json',
  icons: {
    apple: '/ico_v2.jpg',
  },
};

export const viewport: Viewport = {
  themeColor: '#64B5F6',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Compatibilidade PWA / iOS */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Meu orçamento" />
        <meta name="display" content="standalone" />
      </head>

      <body className={`${inter.variable} font-body antialiased`}>
        <UnifiedThemeProvider>
          <TooltipProvider>
            <DirtyStateProvider>
              <PermissionDialogProvider>
                <div className="flex flex-col min-h-screen">
                  <main className="flex-1 flex flex-col">
                    <FirebaseAuthHandler />
                    <PwaRegistry />
                    {children}
                  </main>
                  <footer className="py-4 px-6 text-center text-sm text-muted-foreground border-t bg-background">
                    <div className="flex justify-center items-center gap-4 flex-wrap">
                      <a href="https://aplicativos-ton.vercel.app/" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        Conheça meus aplicativos
                      </a>
                      <span className="text-muted-foreground/50 hidden sm:inline">|</span>
                      <a href="https://wa.me/5535991210466" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                        Suporte via WhatsApp
                      </a>
                    </div>
                  </footer>
                </div>
                <Toaster />
              </PermissionDialogProvider>
            </DirtyStateProvider>
          </TooltipProvider>
        </UnifiedThemeProvider>
      </body>
    </html>
  );
}
