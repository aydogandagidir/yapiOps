'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { Checkbox } from '@/components/ui/checkbox';
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

interface SignupInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  orgName: string;
  kvkkConsent: true;
}

export default function SignupPage() {
  const t = useTranslations();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  // Localized validation messages — zod schema rebuilt when locale changes.
  const signupSchema = useMemo(
    () =>
      z
        .object({
          fullName: z.string().min(2, t('errors.minChars', { min: 2 })),
          email: z.string().email(t('errors.invalidEmail')),
          password: z.string().min(8, t('errors.passwordMin')),
          confirmPassword: z.string().min(8, t('errors.passwordMin')),
          orgName: z.string().min(2, t('errors.minChars', { min: 2 })),
          kvkkConsent: z.literal(true, {
            errorMap: () => ({ message: t('errors.kvkkRequired') }),
          }),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('errors.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      orgName: '',
      kvkkConsent: false as unknown as true,
    },
  });

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (response.status === 409 || body.error === 'user_already_exists') {
        setServerError(t('errors.userAlreadyExists'));
      } else {
        setServerError(body.error ?? t('errors.unexpectedError'));
      }
      return;
    }

    router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
  }

  const submitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>{t('auth.signupTitle')}</CardTitle>
        <CardDescription>{t('auth.signupSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fullName')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orgName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.orgName')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.confirmPassword')}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="kvkkConsent"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-start gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onChange={(e) => {
                          field.onChange(e.target.checked);
                        }}
                        onBlur={field.onBlur}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer leading-snug">
                      {t.rich('auth.kvkkConsent', {
                        link: (chunks) => (
                          <Link
                            href="/legal/kvkk"
                            target="_blank"
                            className="font-medium underline"
                          >
                            {chunks}
                          </Link>
                        ),
                      })}
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            {serverError ? (
              <p className="text-sm text-destructive" role="alert">
                {serverError}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('auth.submitSignup')}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center text-sm">
        <span className="text-muted-foreground">{t('auth.haveAccount')}&nbsp;</span>
        <Link href="/login" className="font-medium hover:underline">
          {t('auth.loginTitle')}
        </Link>
      </CardFooter>
    </Card>
  );
}
