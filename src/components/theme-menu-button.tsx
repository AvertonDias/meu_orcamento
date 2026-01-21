"use client";

import * as React from "react";
import { Paintbrush } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { ThemeToggle } from "./theme-toggle";
import { ThemePicker } from "./theme-picker";

export function ThemeMenuButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Personalizar Tema"
        >
          <Paintbrush className="h-5 w-5" />
          <span className="sr-only">Personalizar Tema</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60" align="end">
        <div className="grid gap-6">
          
          <div className="grid gap-2">
            <h4 className="font-medium">Modo</h4>
            <p className="text-xs text-muted-foreground">
              Alternar entre claro e escuro.
            </p>
            <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-sm text-muted-foreground">Claro / Escuro</span>
            </div>
          </div>

          <div className="grid gap-2">
            <h4 className="font-medium">Paleta de Cores</h4>
            <p className="text-xs text-muted-foreground">
              Escolha um tema visual para a aplicação.
            </p>
            <ThemePicker />
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}
