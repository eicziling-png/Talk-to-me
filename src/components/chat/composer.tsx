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
        placeholder="说点什么…"
        rows={1}
        value={value}
      />
      <div className="composer-actions">
        <button disabled={disabled || value.trim().length === 0} type="submit">
          发送
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
