from pathlib import Path
from zipfile import ZipFile
from lxml import etree
import hashlib,json,re,datetime,openpyxl
import os
base=Path(os.environ.get('REVIEW_SCHEDULE_SOURCE_DIR',str(Path.home()/'Downloads')));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
files=[{'file':name,'sha256':hashlib.sha256((base/name).read_bytes()).hexdigest()} for name in ['MOL 114 lab dates FND Block 2026-2027.docx','MOL 114 Lab Schedule (week 10 – week 16) 2026-2027 (1).docx','MOL 114 Lab Schedule CVP Block  (1).docx','REN123_Fall 26-27 Weekly Time Table 10.0.xlsx']];events=[];groups={};issues=[]
def group(text):
 text=re.sub(r'\s+','',text);m=re.search(r'([MF][12])-?([AB])',text)
 if not m:return None
 labs=re.findall(r'[12]\.\d+',text);key=(m[1],m[2]);groups.setdefault(key,set()).update(labs);return {'studentGroup':m[1],'studentSection':m[2],'labGroups':labs}
def minutes(text):
 nums=re.findall(r'(\d{1,2})\s*:\s*(\d{2})',text)
 return [int(h)*60+int(m) for h,m in nums]
for src in files[:3]:
 with ZipFile(base/src['file']) as z:root=etree.fromstring(z.read('word/document.xml'))
 for ti,tbl in enumerate(root.findall('.//w:tbl',ns)):
  for ri,row in enumerate(tbl.findall('w:tr',ns)):
   cells=[' '.join(c.xpath('.//w:t/text()',namespaces=ns)).strip() for c in row.findall('w:tc',ns)]
   if len(cells)<5:continue
   dm=re.fullmatch(r'(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})',cells[1]);times=minutes(cells[3])
   if not dm or len(times)!=2:continue
   d,m,y=map(int,dm.groups());y=y+2000 if y<100 else y;date=datetime.date(y,m,d).isoformat()
   for ci,text in enumerate(cells[4:],4):
    g=group(text)
    if not g:continue
    room=('SG '+str(78 if ci==4 else 81)) if len(cells)>5 else ('SG 78' if 'FND' in src['file'] else '')
    key=(date,*times,g['studentGroup'],g['studentSection'],room)
    event=next((e for e in events if e['_key']==key),None)
    ref={'source':src['file'],'table':ti+1,'row':ri+1,'column':ci+1}
    if event:event['labGroups']=sorted(set(event['labGroups']+g['labGroups']));event['references'].append(ref)
    else:events.append({'id':f'mol-lab-{date}-{times[0]}-{g["studentGroup"]}{g["studentSection"]}-{room.replace(" ","")}', 'date':date,'title':'MOL 114 · Biochemistry lab','start':times[0],'end':times[1],'kind':'lab','course':'MOL','studentGroups':[g['studentGroup']],'studentSection':g['studentSection'],'labGroups':g['labGroups'],'room':room,'references':[ref],'_key':key})
wb=openpyxl.load_workbook(base/files[3]['file']);sh=wb.active;weeks=[];classNames=['M1','M2','F1','F2'];ranges=list(sh.merged_cells.ranges)
for wi,header in enumerate([6,52,98,144,190],1):
 titles={}
 for notescol in [2,6]:
  for line in str(sh.cell(header+33,notescol).value or '').splitlines():
   match=re.match(r'([AP]\d+)[.:]\s*(.+)',line.strip())
   if match:titles[match[1]]=match[2]
 weeks.append({'number':wi,'start':sh.cell(header,2).value.date().isoformat(),'course':'REN'})
 for daycol in [2,6,10,14,18]:
  date=sh.cell(header,daycol).value.date().isoformat()
  for col in range(daycol,daycol+4):
   for row in range(header+2,header+31):
    c=sh.cell(row,col)
    if not isinstance(c.value,str) or not c.value.strip():continue
    title=' '.join(c.value.split());r=next((r for r in ranges if r.min_row==row and r.min_col==col),None)
    endrow=r.max_row if r else row;endcol=r.max_col if r else col
    # Every printed hourly slot spans three worksheet rows. End at the printed last slot end.
    first=(row-header-2)//3;last=(endrow-header-2)//3
    starts=[480,540,600,660,720,780,840,900,960,1020];ends=[530,590,650,710,780,830,890,950,1020,1080]
    if first<0 or last>9:continue
    if 'General Requirements Courses' in title:continue # Advisory placeholder; English is configured separately.
    section=re.search(r'([MF][12])\s*-\s*([AB])',title)
    selected=[classNames[k-daycol] for k in range(col,min(endcol,daycol+3)+1)]
    if section:selected=[section[1]]
    kind='lab' if re.search(r'\bLAB\b',title,re.I) else 'assessment' if re.search(r'\bTBL\b|exam|OSPE',title,re.I) else 'break' if 'Prayer' in title else 'anatomy' if re.match(r'A\d+\b',title) else 'physiology' if re.match(r'P\d+\b',title) else 'mol' if 'MOL' in title else 'other'
    events.append({'id':f'official-ren-{date}-{c.coordinate}','date':date,'title':title,'detail':titles.get(title.split()[0],''),'start':starts[first],'end':ends[last],'kind':kind,'course':'REN','studentGroups':selected,'studentSection':section[2] if section else None,'labGroups':[],'references':[{'source':files[3]['file'],'sheet':sh.title,'cell':c.coordinate,'range':str(r) if r else c.coordinate}],'_key':None})
# Resolve overlapping MOL entries per exact lab subgroup using the newest document first.
rank={files[0]['file']:0,files[2]['file']:1,files[1]['file']:2};resolved=[]
for event in sorted(events,key=lambda e:rank.get(e['references'][0]['source'],3),reverse=True):
 if event['course']!='MOL':resolved.append(event);continue
 for lab in list(event['labGroups']):
  prior=next((e for e in resolved if e['course']=='MOL' and e['date']==event['date'] and e['studentGroups']==event['studentGroups'] and e['studentSection']==event['studentSection'] and lab in e['labGroups']),None)
  if prior:
   if (prior['start'],prior['end'])!=(event['start'],event['end']):issues.append({'date':event['date'],'group':event['studentGroups'][0],'lab':lab,'selected':prior['references'][0],'superseded':event['references'][0]})
   prior['references']+=event['references'];event['labGroups'].remove(lab)
 if event['labGroups']:resolved.append(event)
events=resolved
for e in events:e['references']=list({json.dumps(r,sort_keys=True):r for r in e['references']}.values());e.pop('_key',None);e['source']=e['references'][0]['source'];e['cell']=e['references'][0].get('cell','table '+str(e['references'][0].get('table'))+', row '+str(e['references'][0].get('row')))
catalog={'schema':1,'sources':files,'weeks':weeks,'groups':[{'studentGroup':g,'studentSection':s,'labGroups':sorted(l,key=lambda x:float(x.split('.')[1]))} for (g,s),l in sorted(groups.items())],'events':events,'resolvedConflicts':issues,'notes':['Renal laboratory durations follow the merged cells through the last printed time interval.','GRC placeholder bands are not specific English classes.','No FND or CVP class-wide timetable for other groups is supplied by these four files; only documented MOL labs are added for them.']}
Path('public/group-timetables.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
Path('public/verified-groups.mjs').write_text('export const VERIFIED_GROUPS='+json.dumps(catalog['groups'],separators=(',',':'))+';\n')
print(json.dumps({'events':len(events),'molLabs':sum(e['course']=='MOL' for e in events),'groups':catalog['groups'],'weeks':weeks},indent=2))
