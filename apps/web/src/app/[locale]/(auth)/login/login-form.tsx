'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createSupabaseBrowserClient } from '@yapiops/db/client';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
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
import { Link, useRouter } from '@/i18n/navigation';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);

  // Surface error codes returned by middleware/callback redirects so the user
  // isn't stuck wondering why login keeps bouncing them back.
  useEffect(() => {
    const code = searchParams.get('error');
    if (!code) return;
    const messageMap: Record<string, string> = {
      no_membership: t('errors.unexpectedError'),
      provision_failed: t('errors.unexpectedError'),
      missing_code: t('errors.unexpectedError'),
      session_failed: t('errors.unexpectedError'),
    };
    setServerError(messageMap[code] ?? code);
  }, [searchParams, t]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('auth.loginTitle')}</CardTitle>
        <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError ? (
              <p className="text-sm text-destructive" role="alert">
                {serverError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {t('auth.submitLogin')}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center">
          <Link href="/forgot-password" className="text-sm text-muted-foreground hover:underline">
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <span className="text-muted-foreground">{t('auth.noAccount')}&nbsp;</span>
        <Link href="/signup" className="font-medium hover:underline">
          {t('auth.signupTitle')}
        </Link>
      </CardFooter>
    </Card>
  );
}
