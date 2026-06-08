import { Logo } from '../../components/logo';
import { LogoutButton } from '../../components/logout-button';

// Placeholder protected page — reaching it proves the auth flow works.
// The real projects list (server-component fetch) lands in the next slice.
export default function ProjectsPage() {
  return (
    <div className="center-screen">
      <Logo />
      <h1>You&rsquo;re in 🎉</h1>
      <p>
        Auth works end-to-end via httpOnly cookies.
        <br />
        The projects list arrives in the next slice.
      </p>
      <LogoutButton />
    </div>
  );
}
