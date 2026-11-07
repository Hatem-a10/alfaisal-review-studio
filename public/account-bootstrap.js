'use strict';

(async () => {
 const status = document.getElementById('appBootText');
 const retry = document.getElementById('retryStartup');
 const link = (text, href) => {
  const a = document.createElement('a');
  a.textContent = text;
  a.href = href;
  a.target = '_top';
  status.after(a);
 };
 try {
  const response = await fetch('/api/account-context', {cache:'no-store'});
  if (!response.ok) throw Error('Could not verify your Review Studio account.');
  const account = await response.json();
  if (!account.signedIn) {
   status.textContent = 'Sign in to Review Studio';
   link('Sign in with ChatGPT', '/signin-with-chatgpt?return_to=%2F');
   return;
  }
  if (!/^[0-9a-f]{64}$/.test(account.key) || typeof account.owner !== 'boolean')
   throw Error('Could not verify your Review Studio account.');

  if (!account.owner) {
   location.replace('/student');
   return;
  }

  const scope = account.owner ? '' : ':' + account.key;
  const storageKey = key => scope ? key + scope : key;
  globalThis.reviewAccount = Object.freeze({...account, storageKey,
   namespace:storageKey('alfaisal-review-studio-v1'), deckDatabase:storageKey('review-studio-anki')});
  document.querySelector('.profile-name').firstChild.textContent = account.profile.name;
  document.querySelector('.student-number').textContent = account.profile.number;
  try {
   const appearance = JSON.parse(localStorage.getItem(storageKey('review-studio-appearance')) || 'null') ||
    JSON.parse(localStorage.getItem(reviewAccount.namespace) || '{}').settings || {};
   document.documentElement.dataset.theme = appearance.theme === 'amoled' ? 'amoled' : 'light';
   if (/^#[0-9a-f]{6}$/i.test(appearance.accent || ''))
    document.documentElement.style.setProperty('--accent', appearance.accent);
  } catch {}

  for (const entry of document.querySelectorAll('script[data-studio-src]')) {
   await new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.src = entry.dataset.studioSrc;
    script.onload = resolve;
    script.onerror = () => reject(Error('Could not load Review Studio.'));
    entry.after(script);
   });
  }
 } catch (error) {
  status.textContent = error.message;
  retry.hidden = false;
 }
})();
