/**
 * Získá session ID pro hosta z localStorage.
 * Pokud neexistuje, vygeneruje nové a uloží ho.
 */
export function getGuestSessionId(): string {
  const key = 'autoskola-guest-sessionId';
  let sessionId = localStorage.getItem(key);

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(key, sessionId);
    console.log(`[Session] New guest session ID generated: ${sessionId}`);
  }

  return sessionId;
}
