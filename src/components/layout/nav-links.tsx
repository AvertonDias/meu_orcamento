'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Home, Users, Wrench, Ruler, Settings } from 'lucide-react';
import { useDirtyState } from '@/contexts/dirty-state-context';
import { usePermissionDialog } from '@/hooks/use-permission-dialog';

export const navItems = [
  { href: '/dashboard/orcamento', label: 'Orçamentos', icon: Home },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/materiais', label: 'Itens e Serviços', icon: Wrench },
  { href: '/dashboard/conversoes', label: 'Conversões', icon: Ruler },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
];

export const NavLinks = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { isDirty, setIsDirty } = useDirtyState();
  const { requestPermission } = usePermissionDialog();

  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // Only run custom logic if the form is dirty
    if (isDirty && pathname !== href) {
      e.preventDefault(); // Stop the navigation
      const discardChanges = await requestPermission({
        title: "Alterações não salvas",
        description: "Deseja descartar as alterações e sair?",
        actionLabel: "Sair",
        cancelLabel: "Ficar"
      });
      if (discardChanges) {
        setIsDirty(false);
        router.push(href); // Navigate programmatically
      }
    }
    // If not dirty, do nothing and let the Link component handle navigation normally.
  };

  return (
    <nav className="grid gap-1 px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        
        return (
          <Tooltip key={item.href} delayDuration={0}>
            <Link href={item.href} legacyBehavior passHref>
              <TooltipTrigger asChild>
                <a
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg py-2 transition-all hover:text-primary outline-none w-full',
                    isActive ? 'bg-muted text-primary font-medium' : 'text-muted-foreground',
                    isCollapsed ? 'h-9 w-9 justify-center p-0' : 'px-3 justify-start'
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className={cn("truncate", isCollapsed && "sr-only")}>{item.label}</span>
                </a>
              </TooltipTrigger>
            </Link>
            <TooltipContent side="right" sideOffset={10}>
              {item.label}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
};
