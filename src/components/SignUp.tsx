import { useState } from 'react';
import { supabase } from '../supabase';
import TurnstileWidget from './Turnstile.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { Moon, Sun } from 'lucide-react';

function Footer() {
  return (
    <footer className="w-full py-4 mt-8 text-center text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} DavioCZ. Všechna práva vyhrazena.</p>
      <p>Vytvořeno pro účely autoškoly.</p>
    </footer>
  );
}

export default function SignUp({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username, captchaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Neznámá chyba při registraci.');
      }

      setSuccess('Registrace byla úspěšná! Pokud je vyžadováno, zkontrolujte svůj e-mail pro ověření.');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm p-6">
        <CardHeader className="text-center">
          <h2 className="text-2xl font-bold">Registrace</h2>
          <p className="text-sm text-muted-foreground mt-2">Vytvořte si nový účet.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">Uživatelské jméno</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                placeholder="Tester"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                placeholder="vas@email.cz"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Heslo</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && <p className="text-xs text-green-600">{success}</p>}
            
            <div className="flex justify-center items-center my-4 h-[65px]">
              {!captchaToken ? (
                <TurnstileWidget onSuccess={setCaptchaToken} />
              ) : (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Registruji...' : 'Zaregistrovat se'}
                </Button>
              )}
            </div>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Nebo</span>
            </div>
          </div>

          <Button onClick={onSwitchToLogin} variant="secondary" className="w-full" disabled={loading}>
            Zpět na přihlášení
          </Button>

          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              Změnit motiv
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="absolute bottom-0 w-full">
        <Footer />
      </div>
    </div>
  );
}
