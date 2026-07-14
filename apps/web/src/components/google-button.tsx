'use client';
import axios, { type AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// --- Minimal typing for the Google Identity Services global (avoids `any`). ---
interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}

interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'small' | 'medium' | 'large';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
  logo_alignment?: 'left' | 'center';
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
  prompt: () => void;
}

interface GoogleGlobal {
  accounts: { id: GoogleAccountsId };
}

declare global {
  interface Window {
    google?: GoogleGlobal;
  }
}

// Load the GIS script exactly once, even across multiple mounts / pages.
let gisPromise: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;

  gisPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Failed to load Google script')),
      );
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
  return gisPromise;
}

interface GoogleButtonProps {
  /** Surface an auth error to the host page (e.g. into the .server-error box). */
  onError: (message: string) => void;
}

export function GoogleButton({ onError }: GoogleButtonProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep the latest onError without re-running the GIS init effect.
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    async function handleCredential(response: GoogleCredentialResponse) {
      try {
        // Same-origin call to the BFF route handler (not the Nest API directly).
        await axios.post('/api/auth/google', {
          credential: response.credential,
        });
        router.replace('/projects');
        router.refresh();
      } catch (err) {
        const message = (err as AxiosError<{ message?: string | string[] }>)
          .response?.data?.message;
        onErrorRef.current(
          Array.isArray(message)
            ? message[0]
            : message ?? 'Google sign-in failed',
        );
      }
    }

    loadGis()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const id = window.google?.accounts?.id;
        if (!id) return;
        id.initialize({
          client_id: CLIENT_ID as string,
          callback: handleCredential,
        });
        containerRef.current.replaceChildren();
        id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: 380,
        });
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current('Could not load Google sign-in');
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  // If the client id isn't configured yet, render nothing rather than crash.
  if (!CLIENT_ID) return null;

  return (
    <>
      <div className="auth-or">
        <span>or</span>
      </div>
      <div className="google-btn-wrap" ref={containerRef} />
    </>
  );
}
