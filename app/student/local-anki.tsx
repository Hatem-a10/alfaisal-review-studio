'use client';
import {useEffect,useState} from 'react';
import styles from './student.module.css';

type Card={id:string|number;schedule:{queue:number}};
type Rating={due:number;reps:number;interval:number};
type Deck={id:string;name:string;cards:Card[];ratings?:Record<string,Rating>};
type Engine={parse(file:File,libraries:unknown,report:(message:string)=>void):Promise<Deck>;
 template(card:Card,back:boolean):string;
 rate(old:Rating|null,rating:string,now:number):Rating};
type Loader=()=>Promise<{engine:Engine;libraries:unknown}>;
let reader:ReturnType<Loader>|null=null;

function loadReader() {
 if (!reader) reader=(async()=>{
  const context=globalThis as typeof globalThis & {loadStudentAnki?:Loader};
  if (!context.loadStudentAnki) await new Promise<void>((resolve,reject)=>{
   const script=document.createElement('script');
   script.src='/student-anki-loader.js';
   script.onload=()=>resolve();
   script.onerror=()=>reject(Error('Anki reader unavailable.'));
   document.head.appendChild(script);
  });
  if (!context.loadStudentAnki) throw Error('Anki reader unavailable.');
  return context.loadStudentAnki();
 })().catch(error=>{reader=null;throw error});
 return reader;
}

function decksOnDevice(accountKey:string,operation:'all'|'put'|'delete',value?:Deck|string):Promise<Deck[]> {
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open('review-studio-student-anki:'+accountKey,1);
  request.onupgradeneeded=()=>request.result.createObjectStore('decks',{keyPath:'id'});
  request.onerror=()=>reject(Error('Device deck storage is unavailable.'));
  request.onsuccess=()=>{
   const db=request.result;
   const tx=db.transaction('decks',operation==='all'?'readonly':'readwrite');
   const store=tx.objectStore('decks');
   if (operation==='put') store.put(value);
   if (operation==='delete') store.delete(value as string);
   const list=store.getAll();
   tx.oncomplete=()=>{db.close();resolve(list.result as Deck[])};
   tx.onabort=tx.onerror=()=>{db.close();reject(Error('The device could not save the Anki deck.'))};
  };
 });
}

function cardText(markup:string) {
 const template=document.createElement('template');
 template.innerHTML=markup;
 template.content.querySelectorAll('script,style,link,iframe,object,embed').forEach(node=>node.remove());
 return template.content.textContent;
}

export function StudentAnki({accountKey}:{accountKey:string}) {
 const [decks,setDecks]=useState<Deck[]>([]);
 const [active,setActive]=useState('');
 const [back,setBack]=useState(false);
 const [engine,setEngine]=useState<Engine|null>(null);
 const [busy,setBusy]=useState(false);
 const [status,setStatus]=useState('');
 useEffect(()=>{decksOnDevice(accountKey,'all').then(setDecks).catch(error=>setStatus(error.message))},[accountKey]);
 const deck=decks.find(item=>item.id===active);
 const card=deck?.cards.find(card=>card.schedule.queue>=0 && (deck.ratings?.[card.id]?.due||0)<=Date.now());
 const markup=card&&engine?engine.template(card,back):'';
 const text=markup?cardText(markup):'';

 async function run(work:()=>Promise<void>) {
  setBusy(true);setStatus('');
  try {await work()} catch(error) {setStatus(error instanceof Error?error.message:'Anki request failed.')}
  finally {setBusy(false)}
 }

 return <details><summary>Local Anki decks</summary>
  <p>Decks and their reviews stay on this device. This reader displays text and cloze cards.</p>
  <label>Import an Anki package<input type="file" accept=".apkg,.colpkg" disabled={busy} onChange={event=>{
   const file=event.target.files?.[0];event.target.value='';if(!file)return;
   run(async()=>{const {engine,libraries}=await loadReader();const deck=await engine.parse(file,libraries,setStatus);
    const old=decks.find(item=>item.id===deck.id);
    setDecks(await decksOnDevice(accountKey,'put',{...deck,ratings:old?.ratings}));setStatus('Deck imported on this device.');});
  }}/></label>
  <ul>{decks.map(deck=><li key={deck.id}><div className={styles.row}>
   <button disabled={busy} onClick={()=>run(async()=>{const {engine}=await loadReader();setEngine(engine);setActive(deck.id);setBack(false)})}>
    {deck.name} · {deck.cards.length} cards
   </button>
   <button disabled={busy} onClick={()=>{if(confirm('Remove this local Anki deck?')) run(async()=>{
    setDecks(await decksOnDevice(accountKey,'delete',deck.id));if(active===deck.id)setActive('');
   })}}>Remove</button>
  </div></li>)}</ul>
  {deck && (card && engine ? <section>
   <p style={{whiteSpace:'pre-wrap'}}>{text}</p>
   {!back ? <button disabled={busy} onClick={()=>setBack(true)}>Show answer</button> :
    <div className={styles.row}>{['again','hard','good','easy'].map(rating=><button key={rating} disabled={busy}
     onClick={()=>run(async()=>{const ratings={...deck.ratings,[card.id]:engine.rate(deck.ratings?.[card.id]||null,rating,Date.now())};
      setDecks(await decksOnDevice(accountKey,'put',{...deck,ratings}));setBack(false);
     })}>{rating}</button>)}</div>}
  </section> : <p>No cards are due.</p>)}
  {status && <p role="status">{status}</p>}
 </details>;
}
