export const normalize=value=>typeof value==='string'?value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim():'';
const array=v=>Array.isArray(v)?v:[];
const identifier=v=>typeof v==='string'&&v.length>0;
const courses={cvp:'112',mol:'114',ren:'123'};
function cardLabels(deck,card){return [deck.name,card.deck,...(Array.isArray(card.tags)?card.tags:[card.tags])].map(normalize).filter(Boolean)}
function explicitlyScoped(text){return new Set([...text.matchAll(/(?:^| )(cvp|mol|ren)(?= |$)/g)].map(m=>m[1]))}
export function matchDecks(lectures,decks){
 const result=new Map(),seenDecks=new Set(),validLectures=array(lectures).flatMap(lecture=>{
  if(!identifier(lecture?.id))return [];
  const code=lecture.id.match(/^(CVP|MOL|REN)-([AP]?)(\d+)$/);if(!code)return [];
  const name=normalize(lecture.title),course=code[1].toLowerCase(),letter=code[2].toLowerCase(),number=code[3];
  return [{lecture,name,course,letter,explicit:new RegExp('(?:^| )'+course+' (?:'+courses[course]+' )?'+letter+' ?'+number+'(?: |$)'),local:new RegExp('(?:^| )'+letter+' ?'+number+'(?: |$)')}];
 });
 for(const deck of array(decks)){
  if(!identifier(deck?.id)||seenDecks.has(deck.id)||!Array.isArray(deck.cards))continue;
  seenDecks.add(deck.id);
  const cardText=deck.cards.filter(card=>identifier(card?.id)&&!(Number(card.schedule?.queue)<0)).map(card=>({id:card.id,labels:cardLabels(deck,card)}));
  for(const {lecture,name,course,letter,explicit,local} of validLectures){
   const ids=[...new Set(cardText.filter(card=>{
    const {labels}=card;if(labels.some(text=>explicit.test(text)))return true;
    const scoped=card.scoped??=new Set(labels.flatMap(text=>[...explicitlyScoped(text)]));
    if(scoped.size&&(!scoped.has(course)||scoped.size>1))return false;
    if(letter&&scoped.has(course)&&labels.some(text=>local.test(text)))return true;
    return name.length>=10&&labels.some(text=>(' '+text+' ').includes(' '+name+' '));
   }).map(c=>c.id))];
   if(ids.length){const list=result.get(lecture.id)||[];if(!list.some(row=>row.deckId===deck.id))list.push({deckId:deck.id,cardIds:ids,count:ids.length,name:deck.name});result.set(lecture.id,list)}
  }
 }
 return result;
}
