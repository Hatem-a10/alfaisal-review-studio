#!/usr/bin/env python3
"""Interactive, staging-only owner bootstrap. Never imports old identities or data."""
import getpass,hashlib,json,os,pathlib,re,secrets,shutil,subprocess,sys
root=pathlib.Path(__file__).resolve().parent.parent
cfg=json.loads((root/'wrangler.staging.jsonc').read_text())
if cfg['name']!='review-studio-staging-20261117' or cfg['d1_databases'][0]['database_id']!='1540bad8-aa39-4c73-9484-28cfd5ea2a05' or cfg.get('routes'):raise SystemExit('Staging configuration mismatch. Stopped.')
local=root/'.sites-runtime/staging/.env.clerk'
values={}
for line in local.read_text().splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  name,value=line.split('=',1);values[name]=value.strip().strip('\"\'')
key=values.get('CLERK_SECRET_KEY','')
if not key.startswith('sk_test_'):raise SystemExit('Only Clerk Development keys are accepted.')
subject=sys.argv[1] if len(sys.argv)>1 else input('New Clerk user ID (user_...): ').strip()
if not re.fullmatch(r'user_[A-Za-z0-9]+',subject):raise SystemExit('Invalid user ID.')
node=shutil.which('node') or str(pathlib.Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node')
# Use the same HTTPS runtime as the app; pass credentials only on private stdin.
verify_script="""
import fs from 'node:fs';
const {key,subject}=JSON.parse(fs.readFileSync(0,'utf8'));
try {
 const response=await fetch('https://api.clerk.com/v1/users/'+encodeURIComponent(subject),{
  headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(20000)
 });
 if(!response.ok){console.error('Account service returned HTTP '+response.status);process.exit(1);}
 process.stdout.write(JSON.stringify(await response.json()));
} catch {console.error('Could not reach the account service. Check your connection and retry.');process.exit(1);}
"""
try:
 verified=subprocess.run([node,'--input-type=module','-e',verify_script],input=json.dumps({'key':key,'subject':subject}),text=True,capture_output=True,timeout=25)
 if verified.returncode:
  print(verified.stderr.strip(),file=sys.stderr)
  raise SystemExit('Could not verify that user in the Development instance. No changes made.')
 user=json.loads(verified.stdout)
except (OSError,subprocess.TimeoutExpired,json.JSONDecodeError):raise SystemExit('Account verification could not finish. No changes made; retry when connected.')
primary=next((e for e in user.get('email_addresses',[]) if e['id']==user.get('primary_email_address_id')),None)
if not primary or primary.get('verification',{}).get('status')!='verified' or user.get('banned') or user.get('locked'):raise SystemExit('A verified, active user is required.')
print('\nStaging Worker:',cfg['name']);print('Verified new account:',primary['email_address']);print('Immutable user ID:',subject)
print('This grants only this identity the owner role. Original ChatGPT accounts and data are not touched.')
if input('Type SET STAGING ADMIN to continue: ').strip()!='SET STAGING ADMIN':raise SystemExit('Cancelled.')
phrase=getpass.getpass('Admin Settings phrase (hidden): ')
if len(phrase)<7 or len(phrase)>256:raise SystemExit('Use a phrase of 7–256 characters.')
if phrase!=getpass.getpass('Confirm phrase (hidden): '):raise SystemExit('Phrases did not match.')
salt=secrets.token_bytes(16);digest=hashlib.pbkdf2_hmac('sha256',phrase.encode(),salt,100000).hex();phrase=None
payload={'REVIEW_STUDIO_CLERK_OWNER_SUB':subject,'REVIEW_STUDIO_PANEL_PASSWORD_HASH':'pbkdf2-sha256$100000$'+salt.hex()+'$'+digest}
path=root/'.sites-runtime/staging/owner-bootstrap-secrets.json'
fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as out:json.dump(payload,out)
result=subprocess.run([node,'node_modules/wrangler/bin/wrangler.js','secret','bulk',str(path),'--config','wrangler.staging.jsonc'],cwd=root)
if result.returncode:raise SystemExit('Upload failed. No progress was changed; rerun when connected.')
print('\nStaging owner configured. Sign in as this account and open Admin Settings using your phrase.')
