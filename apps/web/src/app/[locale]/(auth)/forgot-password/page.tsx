'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createSupabaseBrowserClient } from '@yapiops/db/client';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';

interface ForgotInput {
  email: string;
}

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () => z.object({ email: z.string().email(t('errors.invalidEmail')) }),
    [t],
  );

  const form = useForm<ForgotInput>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit({ email }: ForgotInput) {
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('auth.resetPasswordTitle')}</CardTitle>
        <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-center text-sm">{t('auth.resetPasswordEmailSent')}</p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('common.submit')}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <Link href="/login" className="font-medium hover:underline">
          {t('common.back')}
        </Link>
      </CardFooter>
    </Card>
  );
}
