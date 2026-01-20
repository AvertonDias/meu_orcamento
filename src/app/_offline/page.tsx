
'use client';

import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
           <div className="bg-white rounded-lg p-2 mb-4">
            <Image
              src="/ico_v2.jpg"
              alt="Logo do App"
              width={80}
              height={80}
            />
          </div>
          <CardTitle>Você está offline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Sem conexão com a internet no momento.
          </p>
          <p className="text-muted-foreground mt-2">
            Por favor, conecte-se e recarregue a página.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
