/**
 * VidsSave Pro — Instagram Login + own-account media listing.
 * Cloudflare Worker. Never put IG_APP_SECRET or access tokens in browser code.
 * Bind a KV namespace named TOKENS and set IG_APP_ID, IG_APP_SECRET,
 * IG_REDIRECT_URI, FRONTEND_ORIGIN as Worker secrets/vars.
 */
const API = "https://graph.instagram.com/v26.0";
const COOKIE = "vsp_session";
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {
  status, headers: { "content-type":"application/json; charset=utf-8", "cache-control":"no-store", ...headers }
});
const cookie = (value, maxAge=86400) => `${COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
const random = (n=32) => {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, b=>b.toString(16).padStart(2,"0")).join("");
};
function allowedOrigin(request, env) {
  const origin=request.headers.get("Origin");
  return origin && origin===env.FRONTEND_ORIGIN ? origin : null;
}
function cors(request, env) {
  const origin=allowedOrigin(request,env);
  return origin ? {"access-control-allow-origin":origin,"access-control-allow-credentials":"true","vary":"Origin"} : {};
}
async function graph(path, token) {
  const url=new URL(API+path);
  url.searchParams.set("access_token",token);
  const r=await fetch(url,{headers:{"accept":"application/json"}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok || data.error) throw new Error(data.error?.message || "Instagram API request failed");
  return data;
}
export default {
 async fetch(request, env) {
  const url=new URL(request.url), origin=allowedOrigin(request,env), headers=cors(request,env);
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{...headers,"access-control-allow-methods":"GET,OPTIONS","access-control-allow-headers":"content-type"}});
  if(!env.IG_APP_ID || !env.IG_APP_SECRET || !env.IG_REDIRECT_URI || !env.FRONTEND_ORIGIN || !env.TOKENS)
    return json({error:"Instagram integration is not configured yet. Set Worker variables and TOKENS KV."},503,headers);
  if(url.pathname==="/auth/start") {
    const state=random(24);
    await env.TOKENS.put("state:"+state,"1",{expirationTtl:600});
    const auth=new URL("https://www.instagram.com/oauth/authorize");
    auth.searchParams.set("client_id",env.IG_APP_ID);
    auth.searchParams.set("redirect_uri",env.IG_REDIRECT_URI);
    auth.searchParams.set("response_type","code");
    auth.searchParams.set("scope","instagram_business_basic");
    auth.searchParams.set("state",state);
    auth.searchParams.set("enable_fb_login","0");
    return Response.redirect(auth.toString(),302);
  }
  if(url.pathname==="/auth/callback") {
    const state=url.searchParams.get("state"), code=url.searchParams.get("code");
    if(!state || !code || !(await env.TOKENS.get("state:"+state))) return new Response("Invalid or expired login state. Please try connecting again.",{status:400});
    await env.TOKENS.delete("state:"+state);
    const form=new URLSearchParams({client_id:env.IG_APP_ID,client_secret:env.IG_APP_SECRET,grant_type:"authorization_code",redirect_uri:env.IG_REDIRECT_URI,code});
    const shortRes=await fetch("https://api.instagram.com/oauth/access_token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
    const shortData=await shortRes.json().catch(()=>({}));
    if(!shortRes.ok || !shortData.access_token) return new Response("Instagram authorization failed. Check app settings and redirect URI.",{status:400});
    const longUrl=new URL("https://graph.instagram.com/access_token");
    longUrl.search=new URLSearchParams({grant_type:"ig_exchange",client_secret:env.IG_APP_SECRET,access_token:shortData.access_token});
    const longRes=await fetch(longUrl);
    const longData=await longRes.json().catch(()=>({}));
    if(!longRes.ok || !longData.access_token) return new Response("Could not exchange Instagram token. Please retry.",{status:400});
    const sid=random(24);
    await env.TOKENS.put("session:"+sid,JSON.stringify({token:longData.access_token,expires_at:Date.now()+(Number(longData.expires_in)||5184000)*1000}),{expirationTtl:5184000});
    return new Response("",{status:302,headers:{location:env.FRONTEND_ORIGIN+"/?instagram=connected", "set-cookie":cookie(sid,5184000),"cache-control":"no-store"}});
  }
  if(url.pathname==="/api/instagram/me" || url.pathname==="/api/instagram/media") {
    if(!origin) return json({error:"Origin not allowed"},403);
    const sid=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.split("=")[1];
    if(!sid) return json({error:"Connect your Instagram professional account first."},401,headers);
    const raw=await env.TOKENS.get("session:"+sid);
    if(!raw) return json({error:"Instagram session expired. Please reconnect."},401,headers);
    const session=JSON.parse(raw);
    try {
      const data=url.pathname.endsWith("/me")
        ? await graph("/me?fields=user_id,username,account_type,media_count",session.token)
        : await graph("/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=20",session.token);
      if(url.pathname.endsWith("/media")) {
        const items=(data.data||[]).map(item=>({
          id:item.id,caption:item.caption||"",media_type:item.media_type||"UNKNOWN",
          media_url:item.media_url||null,thumbnail_url:item.thumbnail_url||null,
          permalink:item.permalink||null,timestamp:item.timestamp||null
        }));
        return json({data:items,paging:data.paging||null},200,headers);
      }
      return json({user_id:data.user_id,username:data.username,account_type:data.account_type,media_count:data.media_count},200,headers);
    } catch(e) { return json({error:e.message||"Instagram request failed"},502,headers); }
  }
  if(url.pathname==="/auth/logout") {
    if(!origin) return json({error:"Origin not allowed"},403);
    const sid=(request.headers.get("Cookie")||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.split("=")[1];
    if(sid) await env.TOKENS.delete("session:"+sid);
    return json({ok:true},200,{...headers,"set-cookie":cookie("",0)});
  }
  return json({error:"Not found"},404,headers);
 }
};
