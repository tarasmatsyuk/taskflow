import { redirect } from 'next/navigation';

// Home just routes into the app. Middleware sends unauthenticated users to
// /login before this even renders.
export default function Home() {
  redirect('/projects');
}
