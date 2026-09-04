const COLORS={blue:"#8ab4f8",red:"#f28b82",yellow:"#fdd663",green:"#81c995",pink:"#ff8bcb",purple:"#c58af9",cyan:"#78d9ec",orange:"#fcad70",grey:"#bdc1c6"};
const list=document.querySelector("#list"),status=document.querySelector("#status"),input=document.querySelector("#name");
const primaryAction=document.querySelector("#primary-action"),searchToggle=document.querySelector("#search-toggle"),expanded=new Set();
let windowId,searchMode=false,state={workspaces:[],activeId:null};
const cleanUrl=tab=>tab.url&&!tab.url.startsWith("chrome-extension://")?tab.url:"chrome://newtab/";
const save=()=>Promise.all([chrome.storage.sync.set({workspaceData:state.workspaces}),chrome.storage.local.set({workspaceState:state,workspaceActiveId:state.activeId})]);
const ungrouped=async()=>(await chrome.tabs.query({windowId,pinned:false})).filter(tab=>tab.groupId===chrome.tabGroups.TAB_GROUP_ID_NONE);

async function migrateAndLoad(){
  const [synced,local]=await Promise.all([chrome.storage.sync.get("workspaceData"),chrome.storage.local.get(["workspaceState","workspaceActiveId","workspaceMode"])]);
  const fallback=local.workspaceState||state;
  state={workspaces:synced.workspaceData||fallback.workspaces,activeId:local.workspaceActiveId||fallback.activeId};
  if(!state.workspaces.some(w=>w.id===state.activeId))state.activeId=state.workspaces[0]?.id||null;
  if(!synced.workspaceData&&state.workspaces.length)await chrome.storage.sync.set({workspaceData:state.workspaces});
  if(local.workspaceMode!=="ungrouped-v3"){
    const groups=await chrome.tabGroups.query({windowId}),activeWorkspace=state.workspaces.find(w=>w.id===state.activeId);
    const [activeTab]=await chrome.tabs.query({active:true,windowId});
    for(const group of groups){
      const isCurrent=group.id===activeTab?.groupId;
      if(!isCurrent&&!state.workspaces.some(w=>w.title===group.title))continue;
      const tabs=await chrome.tabs.query({groupId:group.id});
      if(isCurrent||group.title===activeWorkspace?.title){
        if(activeWorkspace)activeWorkspace.urls=tabs.map(cleanUrl);
        if(tabs.length)await chrome.tabs.ungroup(tabs.map(t=>t.id));
      }else if(tabs.length)await chrome.tabs.remove(tabs.map(t=>t.id));
    }
    for(const w of state.workspaces)delete w.groupId;
    await Promise.all([save(),chrome.storage.local.set({workspaceMode:"ungrouped-v3"})]);
  }
  const active=state.workspaces.find(w=>w.id===state.activeId),tabs=await ungrouped();
  if(active&&tabs.length){active.urls=tabs.map(cleanUrl);await save();}
}

function small(label,title,handler){const b=document.createElement("button");b.type="button";b.className="small";b.textContent=label;b.title=title;b.onclick=async e=>{e.stopPropagation();await run(handler);};return b;}
const ICONS={down:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9.5 5 5 5-5"/></svg>',up:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14.5 5-5 5 5"/></svg>',move:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="12" height="14" rx="2"/><path d="M10 12h10m-3.5-3.5L20 12l-3.5 3.5"/></svg>',more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'};
function iconSmall(icon,title,handler,className=""){const b=small("",title,handler);b.innerHTML=ICONS[icon];if(className)b.classList.add(className);return b;}
function closeMoreMenus(){document.querySelectorAll(".more-menu").forEach(menu=>menu.hidden=true);}
function moreMenu(items){
  const wrap=document.createElement("div");wrap.className="more-wrap";
  const button=document.createElement("button");button.type="button";button.className="small more-button";button.innerHTML=ICONS.more;button.title="More actions";button.setAttribute("aria-label","More workspace actions");
  const menu=document.createElement("div");menu.className="more-menu";menu.hidden=true;
  for(const item of items){
    const entry=document.createElement("button");entry.type="button";entry.className=`menu-item${item.danger?" danger":""}`;entry.textContent=item.label;entry.disabled=Boolean(item.disabled);
    entry.onclick=event=>{event.stopPropagation();menu.hidden=true;run(item.handler);};menu.appendChild(entry);
  }
  button.onclick=event=>{
    event.stopPropagation();const opening=menu.hidden;closeMoreMenus();if(!opening)return;menu.hidden=false;
    const rect=button.getBoundingClientRect(),height=menu.offsetHeight;menu.style.left=`${Math.max(6,rect.right-148)}px`;menu.style.top=`${Math.min(rect.bottom+4,window.innerHeight-height-6)}px`;
  };
  wrap.append(button,menu);return wrap;
}
async function moveWorkspace(id,delta){
  const index=state.workspaces.findIndex(w=>w.id===id),next=index+delta;
  if(index<0||next<0||next>=state.workspaces.length)return;
  [state.workspaces[index],state.workspaces[next]]=[state.workspaces[next],state.workspaces[index]];await save();
}
async function dropWorkspace(draggedId,targetId,after){
  if(!draggedId||draggedId===targetId)return;
  const dragged=state.workspaces.find(w=>w.id===draggedId);if(!dragged)return;
  state.workspaces=state.workspaces.filter(w=>w.id!==draggedId);
  let index=state.workspaces.findIndex(w=>w.id===targetId);if(index<0)return;
  if(after)index+=1;state.workspaces.splice(index,0,dragged);await save();
}
const tabLabel=url=>{try{const parsed=new URL(url);return parsed.hostname+(parsed.pathname!=="/"?parsed.pathname:"");}catch{return url;}};
async function moveTab(workspace,index){
  const choices=state.workspaces.filter(w=>w.id!==workspace.id);if(!choices.length)throw new Error("Create another workspace first.");
  const answer=prompt(`Move tab to:\n${choices.map((w,i)=>`${i+1}. ${w.title}`).join("\n")}`);if(answer===null)return;
  const target=choices[Number(answer)-1]||choices.find(w=>w.title.toLowerCase()===answer.trim().toLowerCase());
  if(!target)throw new Error("Choose a workspace number or exact name.");
  await send({type:"workspace:tab-move",sourceId:workspace.id,targetId:target.id,index});
}
function tabPanel(workspace,urls,query){
  const panel=document.createElement("div");panel.className="tab-panel";
  const matches=urls.map((url,index)=>({url,index})).filter(item=>!query||tabLabel(item.url).toLowerCase().includes(query));
  if(!matches.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="No matching tabs.";panel.appendChild(empty);return panel;}
  for(const item of matches){
    const row=document.createElement("div");row.className="tab-item";
    const copy=document.createElement("div");copy.className="tab-copy";copy.title=item.url;
    const title=document.createElement("div");title.className="tab-title";title.textContent=tabLabel(item.url);
    const host=document.createElement("div");host.className="tab-host";host.textContent=item.url;
    copy.append(title,host);copy.onclick=()=>run(()=>send({type:"workspace:tab-open",workspaceId:workspace.id,index:item.index}),true);
    const actions=document.createElement("div");actions.className="tab-actions";
    const open=small("Open","Open this tab",()=>send({type:"workspace:tab-open",workspaceId:workspace.id,index:item.index}));open.className="tab-action";
    const move=small("Move","Move to another workspace",()=>moveTab(workspace,item.index));move.className="tab-action";
    const remove=small("×","Remove this tab",()=>send({type:"workspace:tab-remove",workspaceId:workspace.id,index:item.index}));remove.className="tab-action danger";
    actions.append(open,move,remove);row.append(copy,actions);panel.appendChild(row);
  }
  return panel;
}
async function render(){
  list.replaceChildren();if(!state.workspaces.length){const e=document.createElement("div");e.className="empty";e.textContent="Create your first workspace above.";list.appendChild(e);return;}
  const live=await ungrouped(),query=searchMode?input.value.trim().toLowerCase():"";let shown=0;
  for(const w of state.workspaces){
    const active=w.id===state.activeId,urls=active?live.map(cleanUrl):w.urls;
    const workspaceMatch=w.title.toLowerCase().includes(query),tabMatch=urls.some(url=>tabLabel(url).toLowerCase().includes(query));
    if(query&&!workspaceMatch&&!tabMatch)continue;shown++;
    const card=document.createElement("div");card.className="workspace-card";
    const row=document.createElement("div");row.className=`row${active?" active":""}`;
    const handle=document.createElement("span");handle.className="drag-handle";handle.draggable=true;handle.title="Drag to reorder";
    const dot=document.createElement("span");dot.className="dot";dot.style.setProperty("--color",COLORS[w.color]||COLORS.blue);handle.appendChild(dot);
    handle.ondragstart=event=>{event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",w.id);};
    card.ondragover=event=>{event.preventDefault();const after=event.clientY>card.getBoundingClientRect().top+card.offsetHeight/2;row.classList.toggle("drag-before",!after);row.classList.toggle("drag-after",after);};
    row.ondragleave=()=>row.classList.remove("drag-before","drag-after");
    row.ondrop=event=>{event.preventDefault();const after=row.classList.contains("drag-after"),draggedId=event.dataTransfer.getData("text/plain");row.classList.remove("drag-before","drag-after");run(()=>dropWorkspace(draggedId,w.id,after));};
    const main=document.createElement("div");main.className="workspace";const title=document.createElement("div");title.className="title";title.textContent=w.title;
    const count=document.createElement("div");count.className="count";const n=urls.length;count.textContent=`${n} tab${n===1?"":"s"}${active?" · active":" · parked"}`;
    main.append(title,count);main.onclick=()=>run(()=>send({type:"workspace:switch",targetId:w.id}),true);
    const actions=document.createElement("div");actions.className="actions";
    const isExpanded=expanded.has(w.id)||Boolean(query&&tabMatch);const expand=iconSmall(isExpanded?"up":"down",isExpanded?"Hide tabs":"Show tabs",async()=>{expanded.has(w.id)?expanded.delete(w.id):expanded.add(w.id);},"expand");actions.append(expand);
    if(!active)actions.append(iconSmall("move","Move current tab here",()=>send({type:"workspace:move-tab",targetId:w.id}),"move-current"));
    const position=state.workspaces.findIndex(item=>item.id===w.id);
    actions.append(moreMenu([
      {label:"Move up",disabled:position===0,handler:()=>moveWorkspace(w.id,-1)},
      {label:"Move down",disabled:position===state.workspaces.length-1,handler:()=>moveWorkspace(w.id,1)},
      {label:"Rename",handler:async()=>{const value=prompt("Rename workspace",w.title);if(value!==null){w.title=value.trim()||"Untitled workspace";await save();}}},
      {label:"Delete workspace",danger:true,handler:async()=>{if(!confirm(`Delete “${w.title}”?${active?" Its open tabs will remain.":" Its saved tab list will be forgotten."}`))return;state.workspaces=state.workspaces.filter(x=>x.id!==w.id);if(active)state.activeId=null;await save();}}
    ]));row.append(handle,main,actions);card.appendChild(row);
    if(isExpanded){card.classList.add("expanded");card.appendChild(tabPanel(w,urls,query&&!workspaceMatch?query:""));}
    list.appendChild(card);
  }
  if(!shown){const e=document.createElement("div");e.className="empty";e.textContent="No matching workspaces or tabs.";list.appendChild(e);}
}

async function renderRecentlyClosed(){
  const section=document.querySelector("#recent-section"),container=document.querySelector("#recent-list"),counter=document.querySelector("#recent-count"),toggle=document.querySelector("#recent-toggle");container.replaceChildren();
  const cutoff=Date.now()-30*24*60*60*1000,local=await chrome.storage.local.get("closedArchive");
  const archive=(local.closedArchive||[]).filter(item=>item.closedAt>cutoff).slice(0,30);
  if(archive.length!==(local.closedArchive||[]).length)await chrome.storage.local.set({closedArchive:archive});
  toggle.hidden=false;toggle.title=`Recently closed tabs (${archive.length})`;counter.textContent=`(${archive.length})`;
  if(!archive.length){const empty=document.createElement("div");empty.className="empty";empty.textContent="No recently closed tabs yet.";container.appendChild(empty);}
  for(const item of archive){
    const row=document.createElement("div");row.className="recent";const text=document.createElement("div");text.className="recent-text";
    const title=document.createElement("div");title.className="recent-title";title.textContent=item.title||item.url;
    const host=document.createElement("div");host.className="recent-host";let site;try{site=new URL(item.url).hostname||item.url;}catch{site=item.url;}host.textContent=`${item.workspaceTitle||"Workspace"} · ${site}`;
    const button=document.createElement("button");button.className="restore";button.textContent="Restore";
    button.onclick=async()=>{try{await send({type:"archive:restore",archiveId:item.id});window.close();}catch(error){status.textContent=error.message;}};
    text.append(title,host);row.append(text,button);container.appendChild(row);
  }
}

document.querySelector("#recent-toggle").onclick=()=>{
  const main=document.querySelector("main");main.style.height=`${main.getBoundingClientRect().height}px`;
  document.querySelector("#workspace-header").hidden=true;document.querySelector("#create").hidden=true;list.hidden=true;document.querySelector("#recent-section").hidden=false;
};
document.querySelector("#recent-back").onclick=()=>{
  document.querySelector("#recent-section").hidden=true;document.querySelector("#workspace-header").hidden=false;document.querySelector("#create").hidden=false;list.hidden=false;
  document.querySelector("main").style.height="";
};
document.addEventListener("click",event=>{if(!event.target.closest(".more-wrap"))closeMoreMenus();});
async function send(message){const response=await chrome.runtime.sendMessage({...message,windowId});if(!response?.ok)throw new Error(response?.error||"Workspace operation failed.");}
async function run(operation,close=false){status.textContent="";try{await operation();if(close)return window.close();await migrateAndLoad();await render();await renderRecentlyClosed();}catch(error){status.textContent=error.message;}}
function setSearchMode(enabled){searchMode=enabled;input.value="";input.placeholder=enabled?"Search workspaces & tabs":"New workspace name";primaryAction.textContent=enabled?"×":"Add";primaryAction.title=enabled?"Close search":"Add workspace";searchToggle.hidden=enabled;input.focus();render().catch(error=>status.textContent=error.message);}
searchToggle.onclick=()=>setSearchMode(!searchMode);
document.querySelector("#create").onsubmit=event=>{event.preventDefault();if(searchMode)return setSearchMode(false);run(async()=>{const title=input.value.trim();if(!title)return input.focus();await send({type:"workspace:create",title});input.value="";},true);};
input.oninput=()=>{if(searchMode)render().catch(error=>status.textContent=error.message);};
(async()=>{try{windowId=(await chrome.windows.getCurrent()).id;await migrateAndLoad();await render();await renderRecentlyClosed();}catch(error){status.textContent=error.message;}})();
