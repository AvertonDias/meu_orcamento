
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeMenuButton } from '@/components/theme-menu-button';
import { NavLinks, navItems } from '@/components/layout/nav-links';
import { Menu, LogOut } from 'lucide-react';

export function MobileNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logout realizado com sucesso!",
        description: "Você será redirecionado para a página de login.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Erro ao fazer logout: ", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const MobileNavContent = () => (
    <nav className="flex flex-col gap-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              isActive && 'bg-muted text-primary'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b bg-muted/90 px-4 backdrop-blur-sm lg:h-[60px] lg:px-6 md:hidden">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger>
          <span tabIndex={0}>
          <Button variant="outline" size="icon" className="shrink-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu de navegação</span>
          </Button>
          </span>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-4">
          <div className="flex h-14 items-center border-b px-2 mb-4">
            <Link href="/dashboard/orcamento" className="flex items-center gap-2 font-semibold" onClick={() => setIsMobileMenuOpen(false)}>
              <div className="bg-white rounded-md p-1">
                <Image
                    src="/ico_v2.jpg"
                    alt="Logo do App"
                    width={32}
                    height={32}
                />
              </div>
              <span className="">Meu orçamento</span>
            </Link>
          </div>
          <MobileNavContent />
          <div className="mt-auto border-t -mx-4 pt-4 px-4 space-y-2">
              <Button
                onClick={async () => {
                    await handleLogout();
                    setIsMobileMenuOpen(false);
                }}
                variant="ghost"
                className="w-full justify-start gap-3"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        <h1 className="text-lg font-semibold">
          {navItems.find(item => item.href === pathname)?.label || 'Orçamento'}
        </h1>
      </div>
      <ThemeMenuButton />
    </header>
  );
}
