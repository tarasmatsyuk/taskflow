'use client';
import axios from 'axios';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn compact"
      onClick={async () => {
        await axios.post('/api/auth/logout');
        router.replace('/login');
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
