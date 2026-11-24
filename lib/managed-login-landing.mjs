// Some browser/auth SDK combinations encoded the old /#dashboard landing
// as a literal path. Only the exact historical alias is repaired.
export function managedDashboardLanding(request) {
 if(!['GET','HEAD'].includes(request.method))return null;
 const url=new URL(request.url);
 if(url.pathname!=='/%23dashboard')return null;
 // Retain the query for SDK session-handshake parameters. No caller-supplied
 // redirect URL or decoded arbitrary path is accepted.
 url.pathname='/';url.hash='';
 return new Response(null,{status:303,headers:{Location:url.href,'Cache-Control':'no-store'}});
}
