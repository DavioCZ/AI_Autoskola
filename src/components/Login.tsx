import { useState } from 'react';
import { supabase } from '../supabase';
import TurnstileWidget from '@/src/components/Turnstile.tsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTheme } from '../hooks/useTheme';
import { Moon, Sun, LogIn } from 'lucide-react';

// Jednoduchý Footer, aby odpovídal původní struktuře
function Footer() {
  return (
    <footer className="w-full py-4 mt-8 text-center text-xs text-muted-foreground">
      <p>© {new Date().getFullYear()} DavioCZ. Všechna práva vyhrazena.</p>
      <p>Vytvořeno pro účely autoškoly.</p>
    </footer>
  );
}



export default function Login({ onLogin, onSwitchToSignUp }: { onLogin: (name: string) => void; onSwitchToSignUp: () => void; }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password, captchaToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Neznámá chyba při přihlašování.');
      }

      // After a successful server-side login, set the session on the client
      const { session } = data;
      if (session) {
        await supabase.auth.setSession(session);
      } else {
        // Fallback or error if session is not returned
        await supabase.auth.refreshSession();
      }
      
      // The onLogin callback might need to be adjusted depending on what it does
      // For now, we assume it triggers a state change in the parent component
      
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
          <h2 className="text-2xl font-bold">Přihlášení</h2>
          <p className="text-sm text-muted-foreground mt-2">Vítejte zpět!</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium">E-mail nebo uživatelské jméno</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-background text-foreground"
                placeholder="jmeno nebo vas@email.cz"
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
            
            <div className="flex justify-center items-center my-4 h-[65px]">
              {!captchaToken ? (
                <TurnstileWidget onSuccess={setCaptchaToken} />
              ) : (
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Přihlašuji...' : 'Přihlásit se'}
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


          <div className="min-h-[40px]">
            {captchaToken && (
              <Button onClick={() => onLogin("Host")} variant="secondary" className="w-full" disabled={loading}>
                <LogIn className="mr-2 h-4 w-4" />
                Pokračovat jako Host
              </Button>
            )}
          </div>

          <div className="mt-4 text-center text-sm">
            Nemáte účet?{' '}
            <Button variant="link" onClick={onSwitchToSignUp} className="p-0 h-auto">
              Zaregistrujte se
            </Button>
          </div>

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
