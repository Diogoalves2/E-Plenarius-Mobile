/**
 * Mini event bus para reagir a 401 terminal (sessão revogada pelo backend —
 * normalmente porque o usuário fez login em outro dispositivo).
 */
type Reason = 'device-conflict' | 'expired';
type Handler = (reason: Reason, message?: string) => void;

let handler: Handler | null = null;

export const authEvents = {
  onSessionTerminated(cb: Handler) {
    handler = cb;
    return () => { if (handler === cb) handler = null; };
  },
  emitSessionTerminated(reason: Reason, message?: string) {
    handler?.(reason, message);
  },
};
