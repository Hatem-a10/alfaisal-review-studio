import collections, datetime, hashlib, json, re, sys
from pathlib import Path
import pdfplumber

base=Path(sys.argv[1]); catalog_path=Path(sys.argv[2])
groups=['M1','M2','F1','F2']
starts=[480,540,600,660,720,780,840,900,960,1020,1020]
ends=[530,590,650,710,780,830,890,950,1020,1080,1200]
catalog=json.loads(catalog_path.read_text())
source=base.name
rows=[]
with pdfplumber.open(base) as doc:
 for number,p in enumerate(doc.pages,1):
  grid=p.find_table(); values=grid.extract()
  x=[cell[0] for cell in grid.rows[2].cells[1:]]+[grid.rows[2].cells[-1][2]]
  y=[grid.rows[i].bbox[1] for i in range(3,15 if number<5 else 14)]
  days=[datetime.datetime.strptime(values[1][1+4*i],'%d-%b-%y').date().isoformat() for i in range(5)]
  def separated(orientation,a,b,center):
   if orientation=='h':
    return any(e['orientation']=='h' and abs(e['top']-center)<1.0 and e['x0']<=a+1.2 and e['x1']>=b-1.2 and e['non_stroking_color']==(0.,0.,0.) for e in p.edges)
   return any(e['orientation']=='v' and abs(e['x0']-center)<1.0 and e['top']<=a+1.2 and e['bottom']>=b-1.2 and e['non_stroking_color']==(0.,0.,0.) for e in p.edges)
  def rect_color(row,col):
   cx=(x[col]+x[col+1])/2; cy=(y[row]+y[row+1])/2
   return next((r['non_stroking_color'] for r in p.rects if r['width']>14 and r['height']>6 and r['x0']<=cx<r['x1'] and r['top']<=cy<r['bottom']),None)
  titles={}
  for text in p.crop((x[0],y[-1],x[-1],p.height)).extract_text_lines(return_chars=False):
   for m in re.finditer(r'\b([AP]\d+)[.:]\s*(.*?)(?=\s[AP]\d+[.:]|\s+MOL \d|$)',text['text']):
    titles[m[1]]=m[2].strip()
  # The fixed PDF legend columns provide cleaner title/lecturer boundaries.
  for table_row in values[14:]:
   for col in [1,5]:
    for line in (table_row[col] or '').splitlines():
     m=re.match(r'([AP]\d+)[.:]\s*(.+)',line)
     if m:titles[m[1]]=m[2]
  colors={(r,c):rect_color(r,c) for r in range(len(y)-1) for c in range(20)}
  visited=set()
  for key,color in colors.items():
   if key in visited or color in (None,(1.,1.,1.)):continue
   pending=[key]; component=set()
   while pending:
    r,c=pending.pop()
    if (r,c) in component:continue
    component.add((r,c));visited.add((r,c))
    for rr,cc,orientation,a,b,center in [(r-1,c,'h',x[c],x[c+1],y[r]),(r+1,c,'h',x[c],x[c+1],y[r+1]),(r,c-1,'v',y[r],y[r+1],x[c]),(r,c+1,'v',y[r],y[r+1],x[c+1])]:
     if colors.get((rr,cc))==color and (cc//4==c//4 or r==rr==9) and not separated(orientation,a,b,center):
      pending.append((rr,cc))
   r0=min(r for r,c in component);r1=max(r for r,c in component)
   c0=min(c for r,c in component);c1=max(c for r,c in component)
   bounds=(x[c0]+.25,y[r0]+.15,x[c1+1]-.25,y[r1+1]-.15)
   title=' '.join((p.crop(bounds).extract_text() or '').split())
   if not title or re.search(r'general require|requirement s courses',title,re.I):continue
   if c0//4!=c1//4 or len(component)!=(r1-r0+1)*(c1-c0+1):
    raise ValueError((number, r0,c0,r1,c1,title,component))
   assert re.search('[a-zA-Z0-9]',title),(number,title)
   date=days[c0//4]; attached=groups[c0%4:c1%4+1]
   section=re.search(r'An[a-z]* LAB\s+([MF][12])\s*-\s*([AB])',title,re.I)
   if title=='Works for You P7':title='P7' # The unfilled orientation text overflows the visible P7 block.
   code=re.match(r'^([AP]\d+)\b',title)
   if section:
    assert attached==[section[1]]
    title=f'Anatomy lab · {section[1]}-{section[2]}'
   if title.startswith('Anatomy Evening Lab'):
    kind='shared';detail=title.split(':',1)[1].strip();title='Anatomy evening lab'
   else:
    kind='lab' if section else 'assessment' if re.search(r'\bTBL\b|exam|OSPE',title,re.I) else 'break' if 'Prayer' in title else 'anatomy' if code and code[1][0]=='A' else 'physiology' if code else 'mol' if 'MOL' in title else 'other'
    detail=titles.get(code[1],'') if code else ''
   doctor=re.search(r'\((Dr\.[^)]+|Aniko)\)\s*$',detail)
   if doctor:detail=detail[:doctor.start()].strip()
   cell=f'p{number}-r{r0+1}-c{c0+1}'
   e=dict(id=f'official-ren-{date}-{cell}',date=date,title=title,detail=detail,start=starts[r0],end=ends[r1],kind=kind,course='REN',studentGroups=attached,studentSection=section[2] if section else None,labGroups=[],references=[{'source':source,'page':number,'cell':cell}],source=source,cell=cell)
   if doctor:e['doctor']='Dr. Aniko' if doctor[1]=='Aniko' else doctor[1]
   if kind=='shared':e['shared']=True
   if code:
    room=re.search('Room (.+)',title)
    if room:e['room']=room[1]
    e['title']=code[1]
   rows.append(e)
  if number in (2,3,4):
   for c in range(1,21,4):
    text=values[13][c] or ''
    if not text.startswith('Anatomy Evening Lab:'):continue
    key=f'p{number}-evening-c{c}'
    date=days[(c-1)//4]
    rows.append(dict(id=f'official-ren-{date}-{key}',date=date,title='Anatomy evening lab',detail=' '.join(text.split(':',1)[1].split()),start=1020,end=1200,kind='shared',course='REN',studentGroups=groups,studentSection=None,labGroups=[],references=[{'source':source,'page':number,'cell':key}],source=source,cell=key,shared=True))
print(collections.Counter(v['kind'] for v in rows));print('events',len(rows))
for e in rows:
 if e['kind'] in ('other','assessment','lab','shared'):print(e['date'],e['start'],e['end'],e['studentGroups'],e['title'])
def identity(e):
 # A timing/class slot remains the same event when the updated PDF clarifies its title.
 return (e['date'],e['start'],e['end'],e['kind'],tuple(e['studentGroups']),e['studentSection'])
prior={identity(e):e for e in catalog['events'] if e['course']=='REN'}
for e in rows:
 old=prior.get(identity(e))
 if old:e['id']=old['id']
catalog['events']=[e for e in catalog['events'] if e['course']!='REN']+rows
catalog['sources']=[s for s in catalog['sources'] if s['file']!=source]+[{'file':source,'sha256':hashlib.sha256(base.read_bytes()).hexdigest()}]
catalog['notes']=[note for note in catalog['notes'] if not note.startswith('Renal laboratory')]+['Renal Schedule.pdf takes precedence for the five Renal weeks. Group spans and timed blocks follow the printed grid.']
catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
