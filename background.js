const cleanUrl=tab=>tab.url&&!tab.url.startsWith("chrome-extension://")?tab.url:"chrome://newtab/";
const getTabs=async windowId=>(await chrome.tabs.query({windowId,pinned:false})).filter(tab=>tab.groupId===chrome.tabGroups.TAB_GROUP_ID_NONE);
const ignoredClosures=new Set(),tabCache=new Map();
const cacheReady=(async()=>{
  const saved=(await chrome.storage.session.get("tabCache")).tabCache||{};
  for(const [id,tab] of Object.entries(saved))tabCache.set(Number(id),tab);
  for(const tab of await chrome.tabs.query({}))remember(tab);
  await persistCache();
})();
function remember(tab){if(tab?.id)tabCache.set(tab.id,{url:cleanUrl(tab),title:tab.title||tab.url||"Closed tab",windowId:tab.windowId,pinned:tab.pinned,groupId:tab.groupId});}
const persistCache=()=>chrome.storage.session.set({tabCache:Object.fromEntries(tabCache)});
async function closeIntentionally(ids){
  const values=Array.isArray(ids)?ids:[ids];values.forEach(id=>ignoredClosures.add(id));
  try{await chrome.tabs.remove(values);}catch(error){values.forEach(id=>ignoredClosures.delete(id));throw error;}
}
async function addToArchive(tab){
  if(!tab?.url||tab.url==="chrome://newtab/"||tab.url.startsWith("chrome-extension://")||tab.pinned||tab.groupId!==chrome.tabGroups.TAB_GROUP_ID_NONE)return;
  const state=await load(),workspace=state.workspaces.find(w=>w.id===state.activeId);
  if(!workspace)return;
  const local=await chrome.storage.local.get("closedArchive"),cutoff=Date.now()-30*24*60*60*1000;
  let archive=(local.closedArchive||[]).filter(item=>item.closedAt>cutoff&&!(item.url===tab.url&&item.workspaceId===workspace.id));
  archive.unshift({id:crypto.randomUUID(),url:tab.url,title:tab.title||tab.url,workspaceId:workspace.id,workspaceTitle:workspace.title,closedAt:Date.now()});
  await chrome.storage.local.set({closedArchive:archive.slice(0,30)});
}
async function load(){
  const [synced,local]=await Promise.all([chrome.storage.sync.get("workspaceData"),chrome.storage.local.get(["workspaceState","workspaceActiveId"])]);
  const fallback=local.workspaceState||{workspaces:[],activeId:null};
  const workspaces=synced.workspaceData||fallback.workspaces;
  let activeId=local.workspaceActiveId||fallback.activeId;
  if(!workspaces.some(w=>w.id===activeId))activeId=workspaces[0]?.id||null;
  return{workspaces,activeId};
}
async function save(state){
  await Promise.all([chrome.storage.sync.set({workspaceData:state.workspaces}),chrome.storage.local.set({workspaceState:state,workspaceActiveId:state.activeId})]);
}

async function switchWorkspace(windowId,targetId){
  const state=await load(),target=state.workspaces.find(w=>w.id===targetId),source=state.workspaces.find(w=>w.id===state.activeId);
  if(!target)throw new Error("Workspace no longer exists.");
  if(targetId===state.activeId)return;
  let tabs=await getTabs(windowId);
  if(source)source.urls=tabs.map(cleanUrl);
  if(!tabs.length){const [active]=await chrome.tabs.query({active:true,windowId});if(active)tabs=[active];}
  if(!tabs.length)throw new Error("Chrome could not find a tab to reuse.");
  const urls=target.urls.length?target.urls:["chrome://newtab/"],restored=[];
  for(let i=0;i<urls.length;i++){
    let tab=tabs[i];if(!tab)tab=await chrome.tabs.duplicate(restored[0].id);
    tab=await chrome.tabs.update(tab.id,{url:urls[i],active:false});restored.push(tab);
  }
  const extras=tabs.slice(urls.length);if(extras.length)await closeIntentionally(extras.map(t=>t.id));
  state.activeId=target.id;await save(state);await chrome.tabs.update(restored[0].id,{active:true});
}

async function createWorkspace(windowId,title){
  const state=await load(),source=state.workspaces.find(w=>w.id===state.activeId);let tabs=await getTabs(windowId);
  if(source)source.urls=tabs.map(cleanUrl);
  if(!tabs.length){const [active]=await chrome.tabs.query({active:true,windowId});if(active)tabs=[active];}
  const tab=tabs.find(t=>t.active)||tabs[0];if(!tab)throw new Error("Chrome could not find the current tab.");
  const extras=tabs.filter(t=>t.id!==tab.id);if(extras.length)await closeIntentionally(extras.map(t=>t.id));
  await chrome.tabs.update(tab.id,{url:"chrome://newtab/",active:false});
  const created={id:crypto.randomUUID(),title,color:["blue","red","yellow","green","pink","purple","cyan","orange","grey"][state.workspaces.length%9],urls:["chrome://newtab/"]};
  state.workspaces.push(created);state.activeId=created.id;await save(state);await chrome.tabs.update(tab.id,{active:true});
}

async function moveCurrentTab(windowId,targetId){
  const state=await load(),target=state.workspaces.find(w=>w.id===targetId),source=state.workspaces.find(w=>w.id===state.activeId);
  if(!target||target.id===state.activeId)throw new Error("Choose a parked workspace.");
  const [current]=await chrome.tabs.query({active:true,windowId});
  if(!current?.id)throw new Error("Chrome could not find the current tab.");
  if(current.pinned)throw new Error("Pinned tabs are shared and cannot be moved.");
  if(current.groupId!==chrome.tabGroups.TAB_GROUP_ID_NONE)throw new Error("Ungroup this tab before moving it.");
  target.urls.push(cleanUrl(current));
  const tabs=await getTabs(windowId),remaining=tabs.filter(tab=>tab.id!==current.id);
  if(source)source.urls=remaining.map(cleanUrl);
  if(!remaining.length){
    await chrome.tabs.update(current.id,{url:"chrome://newtab/",active:true});
    if(source)source.urls=["chrome://newtab/"];
  }else await closeIntentionally(current.id);
  await save(state);
}

async function restoreArchived(windowId,archiveId){
  const local=await chrome.storage.local.get("closedArchive"),archive=local.closedArchive||[],item=archive.find(entry=>entry.id===archiveId);
  if(!item)throw new Error("That recovery entry is no longer available.");
  const state=await load(),target=state.workspaces.find(w=>w.id===item.workspaceId);
  if(target&&target.id!==state.activeId){target.urls.push(item.url);await save(state);}
  else await chrome.tabs.create({windowId,url:item.url,active:true});
  await chrome.storage.local.set({closedArchive:archive.filter(entry=>entry.id!==archiveId)});
}

async function workspaceTab(windowId,workspaceId,index,action,targetId){
  const state=await load(),workspace=state.workspaces.find(w=>w.id===workspaceId),active=workspaceId===state.activeId;
  if(!workspace)throw new Error("Workspace no longer exists.");
  const tabs=active?await getTabs(windowId):[],urls=active?tabs.map(cleanUrl):workspace.urls;
  const url=urls[index];if(!url)throw new Error("Tab no longer exists.");
  if(action==="open"){
    if(active&&tabs[index])await chrome.tabs.update(tabs[index].id,{active:true});
    else await chrome.tabs.create({windowId,url,active:true});
    return;
  }
  if(action==="move"){
    const target=state.workspaces.find(w=>w.id===targetId);if(!target||target.id===workspaceId)throw new Error("Choose another workspace.");
    target.urls.push(url);
  }
  if(active){
    const tab=tabs[index];
    if(tabs.length===1){await chrome.tabs.update(tab.id,{url:"chrome://newtab/",active:true});workspace.urls=["chrome://newtab/"];}
    else{await closeIntentionally(tab.id);workspace.urls=tabs.filter((_,i)=>i!==index).map(cleanUrl);}
  }else workspace.urls.splice(index,1);
  await save(state);
}

chrome.runtime.onMessage.addListener((message,_sender,respond)=>{
  const work=message?.type==="workspace:switch"?switchWorkspace(message.windowId,message.targetId):message?.type==="workspace:create"?createWorkspace(message.windowId,message.title):message?.type==="workspace:move-tab"?moveCurrentTab(message.windowId,message.targetId):message?.type==="archive:restore"?restoreArchived(message.windowId,message.archiveId):message?.type==="workspace:tab-open"?workspaceTab(message.windowId,message.workspaceId,message.index,"open"):message?.type==="workspace:tab-remove"?workspaceTab(message.windowId,message.workspaceId,message.index,"remove"):message?.type==="workspace:tab-move"?workspaceTab(message.windowId,message.sourceId,message.index,"move",message.targetId):null;
  if(!work)return false;
  work.then(()=>respond({ok:true})).catch(error=>respond({ok:false,error:error.message}));return true;
});

chrome.tabs.onCreated.addListener(tab=>{cacheReady.then(()=>{remember(tab);return persistCache();});});
chrome.tabs.onUpdated.addListener((_id,_change,tab)=>{cacheReady.then(()=>{remember(tab);return persistCache();});});
chrome.tabs.onRemoved.addListener((tabId,removeInfo)=>{cacheReady.then(async()=>{
  const tab=tabCache.get(tabId);tabCache.delete(tabId);await persistCache();
  const intentional=ignoredClosures.delete(tabId);
  if(!intentional&&!removeInfo.isWindowClosing)await addToArchive(tab);
});});

chrome.commands.onCommand.addListener(async(command,tab)=>{
  if(command!=="open-workspaces")return;
  try{
    const windowId=tab?.windowId||(await chrome.windows.getLastFocused()).id;
    if(!windowId)throw new Error("No Chrome window is available.");
    const target=await chrome.windows.get(windowId);
    if(!target.focused)await chrome.windows.update(windowId,{focused:true});
    await chrome.action.openPopup({windowId});
  }catch(error){console.error("Could not open Workspaces popup",error);}
});
