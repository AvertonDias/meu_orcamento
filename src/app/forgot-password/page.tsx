
'use client';

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
        toast({
            title: "Campo obrigatório",
            description: "Por favor, preencha o campo de e-mail.",
            variant: "destructive",
        });
        return;
    }
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "E-mail enviado!",
        description: "Verifique sua caixa de entrada para as instruções de recuperação de senha.",
      });
      router.push('/login');
    } catch (error: any) {
      let errorMessage = "Ocorreu um erro desconhecido.";
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Nenhum usuário encontrado com este e-mail.';
          break;
        case 'auth/invalid-email':
            errorMessage = 'O formato do e-mail é inválido.';
            break;
        default:
          errorMessage = 'Erro ao enviar o e-mail de recuperação.';
          break;
      }
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="rounded-lg p-2">
              <Image
                src="/ico_v2.jpg"
                alt="Logo do App"
                width={80}
                height={80}
              />
            </div>
          </div>
          <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
          <CardDescription>
            Insira seu e-mail para receber as instruções.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" type="email" placeholder="seuemail@exemplo.com" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar E-mail de Recuperação
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Lembrou a senha?{' '}
            <Link href="/login" className="underline text-primary">
              Voltar para o Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
