import type { BrowserMessage } from "@/domain/conversation/browser-session";

type TranscriptProps = {
  messages: BrowserMessage[];
};

export function Transcript({ messages }: TranscriptProps) {
  if (messages.length === 0) {
    return (
      <section aria-label="Transcript" className="chat-transcript">
        <p className="empty-transcript">Start with a question about the expert, a concept, or a reflective theme.</p>
      </section>
    );
  }

  return (
    <section aria-label="Transcript" aria-live="polite" className="chat-transcript">
      {messages.map((message) => (
        <article className={`chat-message ${message.role}`} key={message.id}>
          <p className="message-role">{message.role === "user" ? "You" : "Assistant"}</p>
          <p>{message.content}</p>
          {message.role === "assistant" && message.complete === false ? (
            <p className="incomplete-marker">Incomplete response</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
