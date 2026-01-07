'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeMenuButton } from '@/components/theme-menu-button';
import { NavLinks } from '@/components/layout/nav-links';
import { LogOut, PanelLeftClose, PanelRightOpen } from 'lucide-react';

interface DesktopSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export function DesktopSidebar({ isCollapsed, setIsCollapsed }: DesktopSidebarProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      toast({ 
        title: "Erro ao sair", 
        description: "Tente novamente", 
        variant: "destructive" 
      });
    }
  };

  // Botão de logout isolado para facilitar a renderização condicional
  const logoutButton = (
    <Button 
      onClick={handleLogout} 
      variant="ghost" 
      className={cn(
        'flex items-center gap-3 rounded-lg w-full text-muted-foreground hover:text-primary transition-all',
        isCollapsed ? 'h-9 w-9 p-0 justify-center' : 'px-3 justify-start'
      )}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span className="truncate">Sair</span>}
    </Button>
  );

  return (
    <aside className={cn(
      "hidden md:fixed md:inset-y-0 md:left-0 md:z-10 md:flex flex-col border-r bg-muted/40 transition-all duration-300",
      isCollapsed ? "w-[60px]" : "w-[240px] lg:w-[280px]"
    )}>
      <div className="flex h-full flex-col">
        {/* Header / Logo */}
        <div className={cn(
          "flex h-14 items-center border-b px-4 shrink-0", 
          isCollapsed && "justify-center px-0"
        )}>
          <Link href="/dashboard/orcamento" className="flex items-center gap-2">
            <div className="bg-white rounded-md p-1 shrink-0">
              <Image 
                src="/ico_v2.jpg" 
                alt="Logo" 
                width={24} 
                height={24} 
                className="rounded-sm"
              />
            </div>
            {!isCollapsed && (
              <span className="font-semibold truncate animate-in fade-in duration-500">
                Meu orçamento
              </span>
            )}
          </Link>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <NavLinks isCollapsed={isCollapsed} />
        </div>

        {/* Rodapé / Sair e Toggle */}
        <div className="mt-auto border-t p-2 space-y-2 bg-background/50">
          {/* Só renderiza Tooltip se estiver colapsado para evitar loop de Ref */}
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="w-full flex justify-center">{logoutButton}</div>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          ) : (
            logoutButton
          )}
          
          <div className={cn("flex gap-2", isCollapsed ? "flex-col items-center" : "items-center")}>
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              variant="outline"
              size="icon"
              className={cn("shrink-0", !isCollapsed && "flex-1")}
            >
              {isCollapsed ? <PanelRightOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              <span className="sr-only">Alternar menu</span>
            </Button>
            <ThemeMenuButton />
          </div>
        </div>
      </div>
    </aside>
  );
}