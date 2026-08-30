export function logServerEvent(event: string, payload: Record<string, unknown> = {}): void {
  if (process.env.NODE_ENV !== 'test') console.info(JSON.stringify({ event, ...payload }));
}
