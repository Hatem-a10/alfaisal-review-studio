'use client';

import {useState, type FormEvent} from 'react';

export function AdminUnlock() {
 const [message, setMessage] = useState('');
 const [busy, setBusy] = useState(false);

 async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const password = new FormData(form).get('password');
  form.reset();
  setBusy(true);
  setMessage('');
  try {
   const response = await fetch('/api/admin-session', {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password})
   });
   if (!response.ok) {
    setMessage((await response.json().catch(() => null) as {error?:string}|null)?.error || 'Admin access is unavailable.');
    return;
   }
   window.location.reload();
  } catch {
   setMessage('Could not reach Review Studio. Try again.');
  } finally {
   setBusy(false);
  }
 }

 return <main style={{maxWidth:'28rem', margin:'4rem auto', padding:'1rem'}}>
  <h1>Unlock Admin Settings</h1>
  <p>This temporary unlock applies only to administrative actions.</p>
  <form onSubmit={submit}>
   <label htmlFor="password">Administrator password</label>
   <input id="password" name="password" type="password" autoComplete="current-password" maxLength={256} required />
   <button disabled={busy}>{busy ? 'Unlocking…' : 'Unlock'}</button>
  </form>
  <p role="status">{message}</p>
  <a href="/">Return to Review Studio</a>
 </main>;
}
