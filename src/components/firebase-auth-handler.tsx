'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRedirectResult, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function FirebaseAuthHandler() {
  const router = useRouter();
  const { toast } = useToast();
  // We use a state to track if we are in the process of handling a redirect.
  // This helps prevent flashes of the login page and shows a loader instead.
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        // If result is not null, the user has just signed in via redirect.
        if (result && result.user) {
          toast({
            title: 'Login com Google bem-sucedido!',
            description: 'Redirecionando para o painel.',
          });
          // Redirect to the main dashboard page.
          router.push('/dashboard/orcamento');
          // We don't set isLoading to false here because the page is navigating away.
        } else {
          // If result is null, it means this is a normal page load, not a redirect callback.
          // We can stop showing the loader.
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
    };

    // Run the check on component mount.
    handleRedirect();
  }, [router, toast]);

  // While checking for the redirect result, show a full-screen loader
  // to provide feedback to the user.
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Once done, render nothing. This component is purely for logic.
  return null;
}
