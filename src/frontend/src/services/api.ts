/** Typed API client for the screenshare backend. */

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export type TokenResponse = {
  token: string;
  livekitUrl: string;
  identity: string;
  sessionId: string;
};

export type ScreenShareStartResponse =
  | { granted: true; presenterIdentity: string }
  | {
      granted: false;
      error: 'presenter_lock_held';
      presenterIdentity: string;
      presenterDisplayName: string;
    };

export type ScreenShareStopResponse =
  | { released: true }
  | { released: false; error: 'not_current_presenter' };

export type PresenterResponse = {
  presenterIdentity: string | null;
  presenterDisplayName: string | null;
};

export type LeaveResponse = {
  left: boolean;
  lockReleased: boolean;
};

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function parseJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchToken(
  sessionId: string,
  displayName: string,
): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String((body as { message: string }).message)
        : 'Failed to join session';
    throw new ApiError(res.status, message, body);
  }
  return body as TokenResponse;
}

export async function startScreenShare(
  sessionId: string,
  token: string,
): Promise<ScreenShareStartResponse> {
  const res = await fetch(
    `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/screen-share/start`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await parseJson(res);
  if (res.status === 409) {
    return body as ScreenShareStartResponse;
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to start screen share', body);
  }
  return body as ScreenShareStartResponse;
}

export async function stopScreenShare(
  sessionId: string,
  token: string,
): Promise<ScreenShareStopResponse> {
  const res = await fetch(
    `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/screen-share/stop`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  const body = await parseJson(res);
  if (res.status === 409) {
    return body as ScreenShareStopResponse;
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to stop screen share', body);
  }
  return body as ScreenShareStopResponse;
}

export async function getPresenter(sessionId: string): Promise<PresenterResponse> {
  const res = await fetch(
    `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/presenter`,
  );
  const body = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to get presenter', body);
  }
  return body as PresenterResponse;
}

export async function leaveSession(sessionId: string, token: string): Promise<LeaveResponse> {
  const res = await fetch(`${API_BASE}/sessions/${encodeURIComponent(sessionId)}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to leave session', body);
  }
  return body as LeaveResponse;
}

/** Best-effort leave beacon (does not throw). */
export function leaveSessionBeacon(sessionId: string, token: string): void {
  const url = `${API_BASE}/sessions/${encodeURIComponent(sessionId)}/leave`;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      // sendBeacon cannot set Authorization; fall back to fetch keepalive
    }
    void fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      keepalive: true,
    });
  } catch {
    // fire-and-forget
  }
}
