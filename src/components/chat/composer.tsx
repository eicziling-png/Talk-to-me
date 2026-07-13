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
      <label htmlFor="chat-message">Message</label>
      <textarea
        disabled={disabled}
        id="chat-message"
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        value={value}
      />
      <div className="composer-actions">
        <button disabled={disabled || value.trim().length === 0} type="submit">
          Send
        </button>
        {showStop ? (
          <button onClick={onStop} type="button">
            Stop
          </button>
        ) : null}
      </div>
    </form>
  );
}
