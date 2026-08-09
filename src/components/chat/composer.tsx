import { useCallback, useLayoutEffect, useRef } from "react";

type ComposerProps = {
  value: string;
  disabled?: boolean;
  onChange(value: string): void;
  onSubmit(): void;
  onStop(): void;
  showStop: boolean;
};

export function Composer({
  value,
  disabled = false,
  onChange,
  onSubmit,
  onStop,
  showStop
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    const minHeight = 22;
    const maxHeight = 110;
    textarea.style.height = "auto";
    const contentHeight = textarea.scrollHeight || minHeight;
    const nextHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = contentHeight > maxHeight ? "auto" : "hidden";
  }, []);

  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea, value]);

  return (
    <form
      className="chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label className="sr-only" htmlFor="chat-message">
        输入消息
      </label>
      <textarea
        aria-label="输入消息"
        disabled={disabled}
        id="chat-message"
        onChange={(event) => onChange(event.target.value)}
        ref={textareaRef}
        rows={1}
        value={value}
      />
      <div className="composer-actions">
        <button disabled={disabled || value.trim().length === 0} type="submit">
          送出
        </button>
        {showStop ? (
          <button onClick={onStop} type="button">
            停止
          </button>
        ) : null}
      </div>
    </form>
  );
}
