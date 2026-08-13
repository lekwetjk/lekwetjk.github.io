"use client";

import { useMemo, useState } from "react";
import { withBasePath } from "../lib/basePath";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_INPUT_CHARS = 800;

function resolveChatEndpoint() {
  const externalApiBase = process.env.NEXT_PUBLIC_CHAT_API_URL?.trim();

  if (externalApiBase && /^https?:\/\//i.test(externalApiBase)) {
    return `${externalApiBase.replace(/\/+$/, "")}/api/chat`;
  }

  return withBasePath("/api/chat");
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Witaj. Jestem asystentem KRD-IG. Zadaj pytanie, a postaram się pomóc.",
    },
  ]);
  const [error, setError] = useState<string | null>(null);

  const endpoint = useMemo(resolveChatEndpoint, []);

  function onQuestionKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) {
      return;
    }

    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = input.trim();
    if (!question || isLoading) {
      return;
    }

    setError(null);
    setIsLoading(true);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ message: question }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        reply?: unknown;
        error?: unknown;
      };

      if (!response.ok) {
        const serverError = typeof data.error === "string" ? data.error : "Nie udało się uzyskać odpowiedzi.";
        throw new Error(serverError);
      }

      if (typeof data.reply !== "string" || data.reply.trim().length === 0) {
        throw new Error("Serwer zwrócił pustą odpowiedź.");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply.trim() }]);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Wystąpił błąd połączenia z asystentem.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={`chat-widget ${isOpen ? "chat-widget-open" : ""}`} aria-label="Asystent KRD-IG">
      <button
        type="button"
        className="chat-widget-toggle"
        aria-expanded={isOpen}
        aria-controls="chat-widget-panel"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        Asystent KRD-IG
      </button>

      {isOpen && (
        <div className="chat-widget-panel" id="chat-widget-panel" role="dialog" aria-label="Asystent czatu">
          <p className="chat-widget-caption">MVP: odpowiedzi generowane przez model językowy.</p>

          <div className="chat-widget-messages" aria-live="polite">
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`chat-bubble ${message.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}
              >
                {message.content}
              </p>
            ))}
          </div>

          <form className="chat-widget-form" onSubmit={onSubmit}>
            <label htmlFor="chat-question" className="chat-widget-label">
              Twoje pytanie
            </label>
            <textarea
              id="chat-question"
              name="chat-question"
              rows={3}
              maxLength={MAX_INPUT_CHARS}
              placeholder="Np. Jakie dokumenty są potrzebne przy członkostwie?"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onQuestionKeyDown}
              disabled={isLoading}
            />
            <div className="chat-widget-row">
              <small>{input.length}/{MAX_INPUT_CHARS}</small>
              <button type="submit" className="button button-primary" disabled={isLoading || input.trim().length === 0}>
                {isLoading ? "Wysyłanie..." : "Wyślij"}
              </button>
            </div>
          </form>

          {error && <p className="chat-widget-error">{error}</p>}
        </div>
      )}
    </section>
  );
}
