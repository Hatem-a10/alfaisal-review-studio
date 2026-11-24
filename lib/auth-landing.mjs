// Recover the exact legacy dashboard URL emitted by some authentication clients.
// Do not decode arbitrary paths or turn untrusted path segments into redirects.
export function recoverDashboardLanding(request){
 if(!['GET','HEAD'].includes(request.method))return null;
 const url=new URL(request.url);
 if(url.pathname!=='/%23dashboard')return null;
 url.pathname='/';
 url.hash='dashboard';
 return new Response(null,{status:303,headers:{Location:url.href,'Cache-Control':'no-store'}});
}
