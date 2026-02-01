'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getRedirectResult, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function FirebaseAuthHandler() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  const handleRedirect = useCallback(async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        toast({
          title: 'Login com Google bem-sucedido!',
          description: 'Redirecionando para o painel.',
        });
        router.push('/dashboard/orcamento');
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Erro no redirecionamento do Google:", error);
      let errorMessage = "Não foi possível fazer login com o Google.";
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = 'Já existe uma conta com este e-mail. Tente fazer login com outro método.';
      }
      toast({
        title: "Erro no Login com Google",
        description: errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [router, toast]);

  useEffect(() => {
    handleRedirect();
  }, [handleRedirect]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return null;
}
