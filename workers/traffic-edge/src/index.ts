/**
 * TioTrack Traffic Edge v9
 *
 * Multi-tenant hostname/path routing + Traffic Center rules.
 * Domain config is loaded from KV by `domain:<hostname>`; rules are loaded by
 * `rule-id:<rule_id>` with workspace fallback. Legacy ORIGIN_URL/WORKSPACE_ID
 * still work for the initial single-site setup.
 */
export interface Env {
  COLLECTOR_URL: string
  EDGE_LOG_SECRET?: string
  TRACKER_URL?: string
  TRAFFIC_RULE_JSON?: string
  RULE_CACHE_TTL_SECONDS?: string
  TRAFFIC_RULES?: KVNamespace
  // Legacy fallback only
  ORIGIN_URL?: string
  WORKSPACE_ID?: string
}

type TrafficAction = 'allow' | 'challenge' | 'block' | 'redirect'
type Rule = {
  id?: string; name?: string; workspace_id?: string; enabled?: boolean
  allowed_countries?: string[]; allowed_devices?: string[]; allowed_os?: string[]; blocked_user_agents?: string[]
  challenge_risk_threshold?: number; block_risk_threshold?: number
  default_action?: TrafficAction; deny_action?: TrafficAction; redirect_url?: string | null
  updated_at?: string; _meta?: { schema?: number; synced_at?: string; source?: string }
}
type EdgeRoute = {
  id: string; name: string; enabled: boolean; priority: number; path_prefix: string
  origin_type: 'external' | 'page'; external_origin_url?: string | null; page_id?: string | null
  rule_id?: string | null; inject_tracker: boolean
  page?: null | { storage_base_url: string; storage_prefix: string; entry_file: string; deployment_id: string; page_name?: string | null }
}
type EdgeDomain = {
  id: string; hostname: string; workspace_id: string; enabled: boolean; routes: EdgeRoute[]; tracker_url?: string | null
  _meta?: { schema?: number; synced_at?: string; source?: string }
}
type Decision = { action: TrafficAction; reason: string; risk: number; signals: string[] }

const BUILTIN_AUTOMATION_UA = ['curl','wget','python-requests','go-http-client','httpclient','headlesschrome','phantomjs','selenium','playwright','puppeteer','scrapy']
const STATIC_RE = /\.(?:css|js|mjs|map|json|webmanifest|xml|txt|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf)$/i

function contentTypeForPath(path:string){
  const p=path.toLowerCase()
  if(p.endsWith('.html')||p.endsWith('.htm'))return'text/html; charset=UTF-8'
  if(p.endsWith('.css'))return'text/css; charset=UTF-8'
  if(p.endsWith('.js')||p.endsWith('.mjs'))return'application/javascript; charset=UTF-8'
  if(p.endsWith('.json')||p.endsWith('.map')||p.endsWith('.webmanifest'))return'application/json; charset=UTF-8'
  if(p.endsWith('.xml'))return'application/xml; charset=UTF-8'
  if(p.endsWith('.txt'))return'text/plain; charset=UTF-8'
  if(p.endsWith('.svg'))return'image/svg+xml'
  if(p.endsWith('.png'))return'image/png'
  if(p.endsWith('.jpg')||p.endsWith('.jpeg'))return'image/jpeg'
  if(p.endsWith('.gif'))return'image/gif'
  if(p.endsWith('.webp'))return'image/webp'
  if(p.endsWith('.avif'))return'image/avif'
  if(p.endsWith('.ico'))return'image/x-icon'
  if(p.endsWith('.woff'))return'font/woff'
  if(p.endsWith('.woff2'))return'font/woff2'
  if(p.endsWith('.ttf'))return'font/ttf'
  if(p.endsWith('.otf'))return'font/otf'
  if(p.endsWith('.mp4'))return'video/mp4'
  if(p.endsWith('.webm'))return'video/webm'
  if(p.endsWith('.mp3'))return'audio/mpeg'
  if(p.endsWith('.wav'))return'audio/wav'
  if(p.endsWith('.pdf'))return'application/pdf'
  return null
}

function cacheTtl(env: Env) {
  const n = Number(env.RULE_CACHE_TTL_SECONDS || '30')
  return Number.isFinite(n) ? Math.max(30, Math.round(n)) : 30
}
function device(ua:string){const s=ua.toLowerCase();if(!s)return'unknown';if(/ipad|tablet|kindle|silk/.test(s))return'tablet';if(/mobi|iphone|ipod|android/.test(s))return'mobile';return'desktop'}
function os(ua:string){const s=ua.toLowerCase();if(/iphone|ipad|ipod/.test(s))return'ios';if(/android/.test(s))return'android';if(/windows/.test(s))return'windows';if(/mac os|macintosh/.test(s))return'macos';if(/linux/.test(s))return'linux';return'unknown'}
function decide(rule:Rule,country:string,ua:string):Decision{
  if(!rule.enabled)return{action:'allow',reason:'Sem regra ativa',risk:0,signals:[]}
  const dev=device(ua), operatingSystem=os(ua), denyAction=rule.deny_action||'block'
  const countries=(rule.allowed_countries||[]).map(v=>v.toUpperCase()), devices=(rule.allowed_devices||[]).map(v=>v.toLowerCase()), systems=(rule.allowed_os||[]).map(v=>v.toLowerCase())
  if(countries.length&&country&&country!=='XX'&&!countries.includes(country.toUpperCase()))return{action:denyAction,reason:`País ${country} não permitido`,risk:0,signals:['country']}
  if(devices.length&&!devices.includes(dev))return{action:denyAction,reason:`Dispositivo ${dev} não permitido`,risk:0,signals:['device']}
  if(systems.length&&operatingSystem!=='unknown'&&!systems.includes(operatingSystem))return{action:denyAction,reason:`Sistema ${operatingSystem} não permitido`,risk:0,signals:['os']}
  const u=ua.toLowerCase();const patterns=[...BUILTIN_AUTOMATION_UA,...(rule.blocked_user_agents||[])].map(v=>v.toLowerCase()).filter(Boolean)
  const signals:string[]=[];let risk=0;if(!ua){risk+=25;signals.push('user-agent ausente')}if(patterns.some(p=>u.includes(p))){risk+=55;signals.push('user-agent de automação')}risk=Math.max(0,Math.min(100,risk))
  if(risk>=(rule.block_risk_threshold??75))return{action:'block',reason:signals.join(' + ')||'Risco alto',risk,signals}
  if(risk>=(rule.challenge_risk_threshold??40))return{action:'challenge',reason:signals.join(' + ')||'Risco moderado',risk,signals}
  return{action:rule.default_action||'allow',reason:'Regras atendidas',risk,signals}
}

async function loadDomain(env:Env,hostname:string):Promise<EdgeDomain|null>{
  if(!env.TRAFFIC_RULES)return null
  try{return await env.TRAFFIC_RULES.get(`domain:${hostname.toLowerCase()}`,{type:'json',cacheTtl:cacheTtl(env)}) as EdgeDomain|null}catch{return null}
}
async function loadRule(env:Env,workspaceId:string,ruleId?:string|null):Promise<{rule:Rule;source:string}>{
  if(env.TRAFFIC_RULES){
    try{
      if(ruleId){const byId=await env.TRAFFIC_RULES.get(`rule-id:${ruleId}`,{type:'json',cacheTtl:cacheTtl(env)}) as Rule|null;if(byId)return{rule:byId,source:'kv:rule-id'}}
      const byWorkspace=await env.TRAFFIC_RULES.get(`rule:${workspaceId}`,{type:'json',cacheTtl:cacheTtl(env)}) as Rule|null;if(byWorkspace)return{rule:byWorkspace,source:'kv:workspace'}
    }catch{}
  }
  if(env.TRAFFIC_RULE_JSON){try{return{rule:JSON.parse(env.TRAFFIC_RULE_JSON),source:'env'}}catch{}}
  return{rule:{enabled:false},source:'disabled'}
}
function findRoute(domain:EdgeDomain,path:string){
  return [...(domain.routes||[])].filter(r=>r.enabled&&path.startsWith(r.path_prefix||'/')).sort((a,b)=>{const dl=(b.path_prefix||'/').length-(a.path_prefix||'/').length;return dl!==0?dl:a.priority-b.priority})[0]||null
}
function remainder(path:string,prefix:string){const p=prefix||'/';if(p==='/'||!path.startsWith(p))return path;const rest=path.slice(p.length);return rest.startsWith('/')?rest:`/${rest}`}
function shouldLog(request:Request){const destination=request.headers.get('sec-fetch-dest');if(destination==='document')return true;return !STATIC_RE.test(new URL(request.url).pathname)}
function decisionHeaders(decision:Decision,rule:Rule,source:string,route?:EdgeRoute|null){const h=new Headers({'Cache-Control':'no-store','X-TioTrack-Decision':decision.action,'X-TioTrack-Rule-Source':source});if(rule.updated_at)h.set('X-TioTrack-Rule-Version',rule.updated_at);if(route?.id)h.set('X-TioTrack-Route',route.id);return h}

async function log(env:Env,request:Request,decision:Decision,workspaceId:string,country:string,dev:string,operatingSystem:string,rule:Rule,ruleSource:string,cfInfo:Record<string,any>,domain?:EdgeDomain|null,route?:EdgeRoute|null){
  if(!shouldLog(request)||!workspaceId||!env.COLLECTOR_URL)return
  try{
    const url=new URL(request.url)
    const headers:Record<string,string>={'Content-Type':'application/json'}
    if(env.EDGE_LOG_SECRET)headers['X-TioTrack-Edge-Secret']=env.EDGE_LOG_SECRET

    const q=(name:string)=>url.searchParams.get(name)
    const visitorIp=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||null
    const requestId=request.headers.get('cf-ray')||crypto.randomUUID()
    const clickId=q('click_id')||q('sck')||q('xcod')||null

    await fetch(env.COLLECTOR_URL,{method:'POST',headers,body:JSON.stringify({
      workspace_id:workspaceId,
      request_id:requestId,
      event_name:'edge_request',
      path:url.pathname,
      landing_url:request.url,
      referer:request.headers.get('referer'),
      ip:visitorIp,
      country,
      region:cfInfo.regionCode||cfInfo.region||null,
      city:cfInfo.city||null,
      asn:cfInfo.asn!=null?String(cfInfo.asn):null,
      language:request.headers.get('accept-language')?.split(',')[0]||null,
      user_agent:request.headers.get('user-agent')||'',
      click_id:clickId,
      utm_source:q('utm_source'),
      utm_medium:q('utm_medium'),
      utm_campaign:q('utm_campaign'),
      utm_content:q('utm_content'),
      utm_term:q('utm_term'),
      utm_id:q('utm_id'),
      ttclid:q('ttclid'),
      fbclid:q('fbclid'),
      gclid:q('gclid'),
      metadata:{
        hostname:url.hostname,
        domain_id:domain?.id||null,
        route_id:route?.id||null,
        route_name:route?.name||null,
        route_origin_type:route?.origin_type||null,
        edge_decision:decision.action,
        edge_reason:decision.reason,
        edge_risk:decision.risk,
        edge_signals:decision.signals,
        device:dev,
        os:operatingSystem,
        colo:cfInfo.colo||null,
        timezone:cfInfo.timezone||null,
        rule_id:rule.id||null,
        rule_name:rule.name||null,
        rule_updated_at:rule.updated_at||null,
        rule_synced_at:rule._meta?.synced_at||null,
        rule_source:ruleSource
      }
    })})
  }catch{}
}

async function proxyExternal(request:Request,incoming:URL,route:EdgeRoute){
  const base=new URL(route.external_origin_url||'');const rest=remainder(incoming.pathname,route.path_prefix||'/')
  const basePath=base.pathname.endsWith('/')?base.pathname.slice(0,-1):base.pathname
  base.pathname=`${basePath}${rest||'/'}`.replace(/\/+/g,'/');base.search=incoming.search
  const upstream=new Request(base.toString(),request);upstream.headers.set('X-TioTrack-Route',route.id)
  return fetch(upstream)
}
async function fetchPageAsset(incoming:URL,route:EdgeRoute){
  if(!route.page)return new Response('Page sem deployment publicado.',{status:503})

  const rest=remainder(incoming.pathname,route.path_prefix||'/').replace(/^\/+/, '')
  let relative=rest||route.page.entry_file||'index.html'
  const base=route.page.storage_base_url.replace(/\/$/,'')
  const prefix=route.page.storage_prefix.replace(/^\/+|\/+$/g,'')

  let res=await fetch(`${base}/${prefix}/${relative}`,{headers:{'Accept':'*/*'}})

  if(res.status===404&&!STATIC_RE.test(relative)&&relative!==route.page.entry_file){
    relative=route.page.entry_file||'index.html'
    res=await fetch(`${base}/${prefix}/${relative}`,{headers:{'Accept':'*/*'}})
  }

  const headers=new Headers(res.headers)
  const detected=contentTypeForPath(relative)
  const current=(headers.get('content-type')||'').toLowerCase()

  if(detected&&(!current||current.includes('text/plain')||current.includes('application/octet-stream'))){
    headers.set('Content-Type',detected)
  }

  // Supabase Storage serves uploaded HTML with a restrictive CSP (default-src 'none'; sandbox).
  // That policy is correct for a raw storage URL, but it prevents Tiotrack Pages from loading
  // their own CSS, images, fonts and scripts when the same object is proxied as a website.
  headers.delete('content-security-policy')
  headers.delete('content-security-policy-report-only')
  headers.delete('content-disposition')

  // Public Page URLs are stable while deployments can change behind the route. Avoid pinning
  // stale HTML/assets in the visitor browser during deploy/rollback while the Pages MVP evolves.
  headers.set('Cache-Control','no-store, max-age=0')

  return new Response(res.body,{status:res.status,statusText:res.statusText,headers})
}
function injectTracker(html:string,trackerUrl:string,workspaceId:string){
  if(!trackerUrl||html.includes('data-tiotrack-injected="1"'))return html
  const script=`<script async data-tiotrack-injected="1" src="${trackerUrl.replace(/"/g,'&quot;')}" data-workspace="${workspaceId.replace(/"/g,'&quot;')}"></script>`
  if(/<\/head>/i.test(html))return html.replace(/<\/head>/i,`${script}</head>`)
  if(/<\/body>/i.test(html))return html.replace(/<\/body>/i,`${script}</body>`)
  return `${html}${script}`
}
async function finalizeOriginResponse(originResponse:Response,route:EdgeRoute|null,domain:EdgeDomain|null,env:Env,decision:Decision,rule:Rule,source:string){
  let response=originResponse
  const ct=originResponse.headers.get('content-type')||''
  if(route?.inject_tracker&&domain&&ct.includes('text/html')&&originResponse.ok){
    const html=await originResponse.text();const tracker=domain.tracker_url||env.TRACKER_URL||'';const headers=new Headers(originResponse.headers);headers.delete('content-length');headers.delete('content-encoding');headers.delete('etag')
    response=new Response(injectTracker(html,tracker,domain.workspace_id),{status:originResponse.status,statusText:originResponse.statusText,headers})
  }else response=new Response(originResponse.body,originResponse)
  response.headers.set('X-TioTrack-Decision',decision.action);response.headers.set('X-TioTrack-Rule-Source',source);if(route?.id)response.headers.set('X-TioTrack-Route',route.id);if(rule.updated_at)response.headers.set('X-TioTrack-Rule-Version',rule.updated_at)
  return response
}

export default {
  async fetch(request:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const incoming=new URL(request.url), ua=request.headers.get('user-agent')||'', cf=((request as Request&{cf?:Record<string,any>}).cf||{}), country=cf.country||'XX', dev=device(ua), operatingSystem=os(ua)
    const domain=await loadDomain(env,incoming.hostname)
    const workspaceId=domain?.workspace_id||env.WORKSPACE_ID||''
    const route=domain?findRoute(domain,incoming.pathname):null
    const {rule,source}=await loadRule(env,workspaceId,route?.rule_id)
    const decision=decide(rule,country,ua)

    if(incoming.pathname==='/.well-known/tiotrack-edge')return Response.json({ok:true,service:'tiotrack-traffic-edge',mode:domain?'multi-tenant':'legacy',hostname:incoming.hostname,workspace_id:workspaceId||null,domain_id:domain?.id||null,domain_synced_at:domain?._meta?.synced_at||null,route:route?{id:route.id,name:route.name,origin_type:route.origin_type,path_prefix:route.path_prefix}:null,rule_source:source,rule_name:rule.name||null,rule_version:rule.updated_at||null,country,device:dev,os:operatingSystem},{headers:decisionHeaders(decision,rule,source,route)})

    if(domain&&!domain.enabled)return new Response('Domínio indisponível.',{status:503})
    if(domain&&!route)return new Response('Rota não encontrada.',{status:404})
    if(!domain&&!env.ORIGIN_URL)return new Response('Hostname não configurado no Tiotrack Edge.',{status:404})

    ctx.waitUntil(log(env,request,decision,workspaceId,country,dev,operatingSystem,rule,source,cf,domain,route))
    if(decision.action==='redirect'&&rule.redirect_url){const h=decisionHeaders(decision,rule,source,route);h.set('Location',rule.redirect_url);return new Response(null,{status:302,headers:h})}
    if(decision.action==='block')return new Response('Acesso indisponível.',{status:403,headers:decisionHeaders(decision,rule,source,route)})
    if(decision.action==='challenge')return new Response('Verificação necessária.',{status:403,headers:decisionHeaders(decision,rule,source,route)})

    let originResponse:Response
    if(domain&&route?.origin_type==='page')originResponse=await fetchPageAsset(incoming,route)
    else if(domain&&route?.origin_type==='external')originResponse=await proxyExternal(request,incoming,route)
    else {const origin=new URL(env.ORIGIN_URL!);origin.pathname=incoming.pathname;origin.search=incoming.search;originResponse=await fetch(new Request(origin.toString(),request))}
    return finalizeOriginResponse(originResponse,route,domain,env,decision,rule,source)
  }
}
