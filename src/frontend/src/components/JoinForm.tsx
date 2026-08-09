import { useState } from 'react';
import type { FormEvent } from 'react';

export type JoinFormProps = {
  initialSessionId?: string;
  onJoin: (sessionId: string, displayName: string) => void;
  busy?: boolean;
  error?: string | null;
};

const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function JoinForm({ initialSessionId = '', onJoin, busy, error }: JoinFormProps) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const sid = sessionId.trim();
    const name = displayName.trim();
    if (!sid || !SESSION_ID_RE.test(sid)) {
      setLocalError('Enter a valid session ID (letters, numbers, hyphen, underscore).');
      return;
    }
    if (!name) {
      setLocalError('Enter a display name.');
      return;
    }
    setLocalError(null);
    onJoin(sid, name);
  }

  return (
    <form className="join-form" onSubmit={handleSubmit}>
      <label>
        Session ID
        <input
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="team-standup"
          autoComplete="off"
          disabled={busy}
        />
      </label>
      <label>
        Display name
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Ada"
          autoComplete="nickname"
          disabled={busy}
        />
      </label>
      {(localError || error) && <p className="form-error">{localError || error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Joining…' : 'Join session'}
      </button>
    </form>
  );
}
