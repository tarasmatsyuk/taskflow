'use client';
import axios, { type AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { AuthAside } from '../../components/auth-aside';
import { GoogleButton } from '../../components/google-button';
import { Logo } from '../../components/logo';

type RegisterForm = { name: string; email: string; password: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>();
  const [serverError, setServerError] = useState<string | null>(null);

  async function onSubmit(values: RegisterForm) {
    setServerError(null);
    try {
      await axios.post('/api/auth/register', values);
      router.replace('/projects');
      router.refresh();
    } catch (err) {
      const message = (err as AxiosError<{ message?: string | string[] }>)
        .response?.data?.message;
      setServerError(
        Array.isArray(message) ? message[0] : message ?? 'Registration failed',
      );
    }
  }

  return (
    <div className="auth">
      <AuthAside
        title={
          <>
            Start your
            <br />
            first <em>sprint</em> today.
          </>
        }
        subtitle="Create a workspace, invite your team, and turn a backlog into shipped work. Free while you learn the ropes."
      />
      <div className="auth-form">
        <form className="auth-card" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Logo />
          <h2>Create your account</h2>
          <p className="sub">Set up your workspace in under a minute.</p>

          {serverError && <div className="server-error">{serverError}</div>}

          <div className="field">
            <label>Full name</label>
            <div className={`input ${errors.name ? 'invalid' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="3.2" />
                <path d="M5 20a7 7 0 0 1 14 0" />
              </svg>
              <input
                placeholder="Alex Doe"
                autoComplete="name"
                {...register('name', {
                  required: 'Name is required',
                  minLength: { value: 2, message: 'At least 2 characters' },
                  maxLength: { value: 80, message: 'At most 80 characters' },
                })}
              />
            </div>
            {errors.name && <p className="field-error">{errors.name.message}</p>}
          </div>

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
                placeholder="At least 8 characters"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                })}
              />
            </div>
            {errors.password && (
              <p className="field-error">{errors.password.message}</p>
            )}
          </div>

          <button className="btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>

          <GoogleButton onError={setServerError} />

          <p className="auth-foot">
            Already have an account?{' '}
            <Link className="link" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
