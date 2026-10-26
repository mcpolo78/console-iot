'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@demo.fr');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { token } = await api<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      sessionStorage.setItem('token', token);
      sessionStorage.removeItem('demo');
      router.push('/');
    } catch {
      setError('Identifiants invalides');
    }
  }

  return (
    <main>
      <form className="card" onSubmit={submit} style={{ maxWidth: 360 }}>
        <h1>Connexion</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={{ width: '100%' }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" style={{ width: '100%' }} />
        <button type="submit">Se connecter</button>
        {error && <p>{error}</p>}
      </form>
    </main>
  );
}
