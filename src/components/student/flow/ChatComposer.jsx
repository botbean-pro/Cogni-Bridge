import React from "react";
import { ChevronRight } from "lucide-react";

export function ChatComposer({ input, isLoading, onChange, onSubmit }) {
  return (
    <form className="ai-chat-input-form" onSubmit={onSubmit}>
      <div className="ai-input-wrapper">
        <input
          type="text"
          className="ai-chat-input"
          placeholder="Ask me anything about your learning..."
          value={input}
          onChange={(event) => onChange(event.target.value)}
          disabled={isLoading}
          aria-label="Your question"
        />
        <button
          type="submit"
          className="ai-send-btn"
          disabled={!input.trim() || isLoading}
          aria-label="Send message"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      <p className="ai-disclaimer">Cogni-Flow AI can make mistakes. Always verify important information.</p>
    </form>
  );
}
