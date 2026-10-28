from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
files=[]
for base in ['materials','study_material']:
 for p in sorted((root/'public'/base).rglob('*')):
  if p.is_file():
   content=p.read_bytes();files.append({'path':p.relative_to(root/'public').as_posix(),'size':len(content),'sha':hashlib.sha256(content).hexdigest()})
text='// Generated from the original files by scripts/prepare-site-assets.py.\nexport const SITE_ASSETS = '+json.dumps(files,separators=(',',':'))+' as const;\n'
(root/'lib'/'site-assets-manifest.ts').write_text(text)
dir=Path('/private/tmp/review-studio-asset-batches');dir.mkdir(exist_ok=True)
# Each request is kept below 24 MB and 10 objects to respect Worker memory/subrequest limits.
groups=[];group=[];size=0
for item in files:
 if group and (len(group)>=10 or size+item['size']>24000000):groups.append(group);group=[];size=0
 group.append(item);size+=item['size']
if group:groups.append(group)
for i,g in enumerate(groups):
 out=dir/f'batch-{i+1:03}.zip'
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_STORED) as z:
  for x in g:z.write(root/'public'/x['path'],x['path'])
print(json.dumps({'files':len(files),'unique':len(set(x['sha'] for x in files)),'bytes':sum(x['size'] for x in files),'batches':len(groups),'dir':str(dir),'max_batch_bytes':max((dir/f'batch-{i+1:03}.zip').stat().st_size for i in range(len(groups)))}))
