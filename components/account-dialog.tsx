'use client';

import { ArrowRight, LockKeyhole, UserRound, X } from 'lucide-react';
import { useState } from 'react';
import { createAccount, signIn, type CoconutAccount } from '@/lib/account';

type AccountDialogProps = {
  onClose: () => void;
  onAuthenticated: (account: CoconutAccount) => void;
};

export function AccountDialog({ onClose, onAuthenticated }: AccountDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      const account = mode === 'signup'
        ? await createAccount({ name, email, password })
        : await signIn({ email, password });
      onAuthenticated(account);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That account action could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="overlay" role="presentation"><section className="confirmation account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title"><button className="icon-close pressable" type="button" onClick={onClose} aria-label="Close account dialog"><X size={16} /></button><div className="confirmation-mark"><UserRound size={20} /></div><p className="panel-kicker">Optional account</p><h2 id="account-dialog-title">Keep your Coconut close.</h2><p>{mode === 'signup' ? 'Create a lightweight account to save your cart, location, and seller workspace across visits.' : 'Sign in to bring back your saved cart and seller workspace. Guest checkout still works without an account.'}</p><div className="account-tabs" role="tablist" aria-label="Account action"><button className={mode === 'signin' ? 'active' : ''} type="button" role="tab" aria-selected={mode === 'signin'} onClick={() => { setMode('signin'); setError(undefined); }}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => { setMode('signup'); setError(undefined); }}>Create account</button></div><form className="account-form" onSubmit={submit}>{mode === 'signup' ? <label>Name<input name="name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required placeholder="Your maker or buyer name" /></label> : null}<label>Email<input name="email" value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Password<input name="password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={8} required placeholder="8 characters minimum" /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button-primary pressable" type="submit" disabled={busy}>{busy ? 'Saving your account…' : mode === 'signup' ? 'Create my account' : 'Sign in'} <ArrowRight size={14} /></button></form><p className="dialog-footnote"><LockKeyhole size={12} /> Optional for shoppers; seller listings and saved carts belong to your account.</p></section></div>;
}

