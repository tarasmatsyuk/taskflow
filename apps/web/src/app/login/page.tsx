'use client';
import axios, { type AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthAside } from '../../components/auth-aside';
import { Logo } from '../../components/logo';

type LoginForm = { email: string; password: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>();
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: LoginForm) {
    setServerError(null);
    try {
      // Same-origin call to the BFF route handler (not the Nest API directly).
      await axios.post('/api/auth/login', values);
      router.replace('/projects');
      router.refresh();
    } catch (err) {
      const message = (err as AxiosError<{ message?: string | string[] }>)
        .response?.data?.message;
      setServerError(
        Array.isArray(message) ? message[0] : message ?? 'Login failed',
      );
    }
  }

  return (
    <div className="auth">
      <AuthAside
        title={
          <>
            Ship work,
            <br />
            not <em>status meetings.</em>
          </>
        }
        subtitle="A fast, opinionated board for engineering teams. Plan a sprint, drag a card, watch it update live for everyone."
      />
      <div className="auth-form">
        <form className="auth-card" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Logo />
          <h2>Welcome back</h2>
          <p className="sub">Sign in to your TaskFlow workspace.</p>

          {serverError && <div className="server-error">{serverError}</div>}

          <div className="field">
            <label>Email</label>
            <div className={`input ${errors.email ? 'invalid' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <input
                type="email"
                placeholder="you@taskflow.dev"
                autoComplete="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: EMAIL_RE, message: 'Enter a valid email' },
                })}
              />
            </div>
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div className="field">
            <label>Password</label>
            <div className={`input ${errors.password ? 'invalid' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password', { required: 'Password is required' })}
              />
            </div>
            {errors.password && (
              <p className="field-error">{errors.password.message}</p>
            )}
          </div>

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="auth-foot">
            New to TaskFlow?{' '}
            <Link className="link" href="/register">
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
