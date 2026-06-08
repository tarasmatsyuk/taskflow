import type { ReactNode } from 'react';
import { Logo } from './logo';

// Left showcase panel shared by the login + register screens.
export function AuthAside({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle: string;
}) {
  return (
    <div className="auth-show">
      <div className="auth-brand">
        <Logo />
        <span className="name">
          Task<b>Flow</b>
        </span>
      </div>
      <div className="lead">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}
