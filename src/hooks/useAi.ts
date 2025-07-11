// src/hooks/useAi.ts
import { useState } from "react";

export type ChatMessage = { role: "user" | "assistant"; text: string };

export function useAi() {
  const [loading, setLoading] = useState(false);
  const [answer,  setAnswer]  = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const ask = async (userQuestion: string, context: any) => {
    setLoading(true); setAnswer("");
    const currentMessages: ChatMessage[] = [...messages, { role: "user", text: userQuestion }];
    setMessages(currentMessages);

    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuestion, context, history: messages }) // Posíláme předchozí zprávy
      });
      const data = await r.json();
      const assistantResponse = data.answer ?? data.error ?? "⚠️ Bez odpovědi";
      setAnswer(assistantResponse);
      setMessages([...currentMessages, { role: "assistant", text: assistantResponse }]);
    } catch (e: any) {
      const errorMessage = "⚠️ " + e.message;
      setAnswer(errorMessage);
      // I v případě chyby přidáme zprávu od asistenta, aby se chyba zobrazila v chatu
      setMessages([...currentMessages, { role: "assistant", text: errorMessage }]);
    } finally { setLoading(false); }
  };

  return { ask, loading, answer, messages, setMessages }; // Vracíme i messages a setMessages
}
