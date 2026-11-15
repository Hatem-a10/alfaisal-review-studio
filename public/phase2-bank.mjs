export function clearUnanswered(bank,at=new Date().toISOString()){return {...bank,entries:(bank.entries||[]).filter(x=>Number.isInteger(x.choice)),unansweredClearedAt:at}}
