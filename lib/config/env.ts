export type ExternalDataMode = 'auto' | 'demo' | 'live';

export function getExternalDataMode(): ExternalDataMode {
  const value = process.env.EXTERNAL_DATA_MODE;
  return value === 'demo' || value === 'live' ? value : 'auto';
}

export function shouldUseLiveProvider(key?: string): boolean {
  const mode = getExternalDataMode();
  if (mode === 'demo') return false;
  return mode === 'live' ? true : Boolean(key);
}

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE !== 'false';
}
