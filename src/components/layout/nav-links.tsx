'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Home, Users, Wrench, Ruler, Settings } from 'lucide-react';

export const navItems = [
  { href: '/dashboard/orcamento', label: 'Orçamentos', icon: Home },
  { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
  { href: '/dashboard/materiais', label: 'Itens e Serviços', icon: Wrench },
  { href: '/dashboard/conversoes', label: 'Conversões', icon: Ruler },
  { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
];

export const NavLinks = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const linkClass = cn(
          'flex items-center gap-3 rounded-lg py-2 transition-all hover:text-primary outline-none',
          isActive ? 'bg-muted text-primary font-medium' : 'text-muted-foreground',
          isCollapsed ? 'h-9 w-9 justify-center p-0' : 'px-3'
        );

        const content = (
          <Link href={item.href} className={linkClass}>
            <item.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && <span className="truncate">{item.label}</span>}
            <span className="sr-only">{item.label}</span>
          </Link>
        );

        if (!isCollapsed) return <div key={item.href}>{content}</div>;

        return (
          <Tooltip key={item.href} delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="w-full flex justify-center">{content}</div>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
};