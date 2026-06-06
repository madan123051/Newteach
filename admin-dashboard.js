const $ = id => document.getElementById(id);
const api = window.NewTechFirebase;
const state = { user:null, route:'overview', data:{}, selected:new Set(), query:'', filter:'', unsubscribers:[] };
const modules = {
  companies:{label:'Company Profile', singular:'Company', icon:'🏢', fields:[['name','Company Name','text'],['category','Category','text'],['email','Email','email'],['phone','Phone','text'],['website','Website','url'],['address','Address','text'],['status','Status','select',['pending','verified','rejected']],['description','Description','textarea'],['logoUpload','Upload Logo','file'],['coverUpload','Upload Cover Image','file'],['galleryUpload','Upload Gallery Images','file-multiple'],['logoUrl','Logo URL','url'],['coverUrl','Cover Image URL','url'],['galleryUrls','Gallery URLs (comma separated)','text']]},
  media:{label:'Media Library', singular:'Media', icon:'🖼️', media:true},
  news:{label:'News Manager', singular:'News Article', icon:'📰', fields:[['title','Title','text'],['slug','Slug','text'],['summary','Summary','textarea'],['content','Content','textarea'],['status','Status','select',['draft','published','scheduled','archived']],['publishAt','Publish At','datetime-local'],['imageUrl','Featured Image URL','url'],['videoUrl','Video URL','url']]},
  blogs:{label:'Blog Manager', singular:'Blog Post', icon:'✍️', fields:[['title','Title','text'],['slug','Slug','text'],['category','Category','text'],['tags','Tags (comma separated)','text'],['seoTitle','SEO Title','text'],['seoDescription','SEO Description','textarea'],['canonicalUrl','Canonical URL','url'],['content','Content','textarea'],['status','Status','select',['draft','published','scheduled','archived']],['publishAt','Publish At','datetime-local'],['imageUrl','Featured Image URL','url']]},
  jobs:{label:'Job Vacancies', singular:'Job', icon:'💼', fields:[['title','Title','text'],['department','Department','text'],['location','Location','text'],['description','Description','textarea'],['status','Status','select',['draft','active','closed','expired']],['expiryDate','Expiry Date','date'],['applicationCount','Application Count','number'],['applications','Application Tracking Notes','textarea']]},
  ads:{label:'Advertisements', singular:'Advertisement', icon:'📣', fields:[['title','Title','text'],['destinationUrl','Destination URL','url'],['bannerUrl','Banner Image URL','url'],['videoUrl','Video Ad URL','url'],['status','Status','select',['draft','active','paused','expired']],['startAt','Start At','datetime-local'],['endAt','End At','datetime-local'],['placement','Placement','text']]},
  users:{label:'Users', singular:'User', icon:'👥', fields:[['name','Name','text'],['email','Email','email'],['role','Role','select',['Super Admin','Company Admin','Editor']],['status','Status','select',['active','inactive','invited','locked']],['companyId','Company ID','text']]},
  activityLogs:{label:'Activity Logs', singular:'Activity Log', icon:'📜', readonly:true}
};
const routeList = ['overview','companies','media','news','blogs','jobs','ads','users','activityLogs'];
function html(v){ return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function attr(v){ return html(v); }
function toast(message, type='ok'){
  const box = $('toast'); box.textContent = message; box.className = `toast show ${type}`;
  setTimeout(()=>box.className='toast',3200);
}
function dateValue(value){
  if(!value) return '';
  const d = new Date(value);
  if(Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0,16);
}
function roleCan(route){ return route === 'overview' || api.canRead(state.user, route); }
function allowedRoutes(){ return routeList.filter(roleCan); }
async function log(action,type,id='',meta={}){ try{ await api.logActivity(state.user, action, type, id, meta); }catch(e){ console.warn(e); } }
function init(){
  $('configWarning').hidden = api.configured;
  $('loginForm').addEventListener('submit', async e=>{
    e.preventDefault();
    try{
      await api.signInWithEmailAndPassword(api.auth, $('email').value, $('password').value);
    }catch(error){ toast(error.message, 'bad'); }
  });
  $('logoutBtn').onclick = async()=>{ await log('Logout','auth'); await api.signOut(api.auth); };
  $('mobileMenu').onclick = ()=>$('sidebar').classList.toggle('open');
  $('globalSearch').oninput = e=>{ state.query=e.target.value.toLowerCase(); render(); };
  $('darkToggle').onclick = ()=>document.body.classList.toggle('dark');
  if(api.configured){
    api.onAuthStateChanged(api.auth, async firebaseUser=>{
      if(!firebaseUser){ showLogin(); return; }
      state.user = await api.getUserProfile(firebaseUser);
      if(state.user.status && state.user.status !== 'active') toast('Your profile is not active. Ask a Super Admin to activate it.','bad');
      await log('Login','auth');
      showApp();
    });
  }
}
function showLogin(){
  state.unsubscribers.forEach(fn=>fn()); state.unsubscribers=[]; state.user=null;
  $('app').hidden = true; $('login').hidden = false;
}
function showApp(){
  $('login').hidden = true; $('app').hidden = false;
  $('userName').textContent = state.user.name || state.user.email;
  $('userRole').textContent = state.user.role;
  buildNav(); subscribeAll(); render();
}
function subscribeAll(){
  state.unsubscribers.forEach(fn=>fn()); state.unsubscribers=[];
  allowedRoutes().filter(r=>r!=='overview').forEach(name=>{
    state.unsubscribers.push(api.subscribeCollection(name, (rows,error)=>{
      if(error) toast(`${name}: ${error.message}`,'bad');
      state.data[name]=rows; render();
    }));
  });
}
function buildNav(){
  $('nav').innerHTML = allowedRoutes().map(r=>`<button class="nav-item ${state.route===r?'active':''}" data-route="${r}">${r==='overview'?'📊':modules[r].icon}<span>${r==='overview'?'Overview':modules[r].label}</span></button>`).join('');
  $('nav').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{ state.route=btn.dataset.route; state.selected.clear(); $('sidebar').classList.remove('open'); buildNav(); render(); });
}
function render(){
  if(!state.user) return;
  if(state.route === 'overview') return renderOverview();
  if(state.route === 'media') return renderMedia();
  renderTable(state.route);
}
function rowsFor(name){
  let rows = [...(state.data[name] || [])];
  if(state.query) rows = rows.filter(r=>JSON.stringify(r).toLowerCase().includes(state.query));
  if(state.filter) rows = rows.filter(r=>r.status === state.filter);
  return rows;
}
function renderOverview(){
  const counts = Object.fromEntries(Object.keys(modules).map(k=>[k,(state.data[k]||[]).length]));
  $('content').innerHTML = `<div class="breadcrumbs">Dashboard / Overview</div><div class="page-head"><div><h1>Firestore Content Control Center</h1><p class="muted">Every website section subscribes to Firestore, so published changes become visible without static edits.</p></div></div><div class="stats">${Object.entries(counts).slice(0,8).map(([k,v])=>`<div class="stat"><span>${modules[k].label}</span><strong>${v}</strong></div>`).join('')}</div><div class="grid"><section class="card"><h2>Disconnected/fake CRUD audit</h2><ul class="audit-list"><li>Public hero, about, products, gallery, company profile, ads, news/blog/jobs sections now render from Firestore collections.</li><li>Admin create/edit/delete actions now call Firestore, not localStorage.</li><li>Media upload, replace, delete, thumbnails and bulk operations now use Firebase Storage + media documents.</li><li>Login/logout and CRUD actions are written to activityLogs.</li></ul></section><section class="card"><h2>Required collections</h2><p class="muted">${api.requiredCollections.join(', ')}</p></section></div>`;
}
function toolbar(name){
  const mod = modules[name];
  return `<div class="toolbar"><div class="filters"><select onchange="state.filter=this.value;render()"><option value="">All statuses</option>${['draft','published','scheduled','archived','active','inactive','paused','closed','expired','pending','verified','rejected'].map(s=>`<option ${state.filter===s?'selected':''}>${s}</option>`).join('')}</select></div><div class="actions">${!mod.readonly && api.canWrite(state.user,name)?`${name==='media'?'':`<button class="btn btn-primary" onclick="openForm('${name}')">Create ${mod.singular}</button>`}<button class="btn btn-danger" onclick="bulkDelete('${name}')">Bulk delete</button>`:''}</div></div>`;
}
function renderTable(name){
  const mod = modules[name]; const rows = rowsFor(name);
  const columns = name==='activityLogs' ? ['action','entityType','actorName','actorRole','createdAt'] : ['title','name','status','category','department','email','updatedAt'];
  const activeCols = columns.filter(c=>rows.some(r=>r[c]) || ['title','name','status','updatedAt'].includes(c));
  $('content').innerHTML = `<div class="breadcrumbs">Dashboard / ${mod.label}</div><div class="page-head"><div><h1>${mod.label}</h1><p class="muted">Live Firestore collection: ${name}</p></div></div>${toolbar(name)}<div class="table-wrap"><table><thead><tr><th><input type="checkbox" onchange="toggleAll('${name}',this.checked)"></th>${activeCols.map(c=>`<th>${c}</th>`).join('')}<th>Actions</th></tr></thead><tbody>${rows.map(r=>`<tr><td><input type="checkbox" ${state.selected.has(r.id)?'checked':''} onchange="toggleOne('${r.id}',this.checked)"></td>${activeCols.map(c=>`<td>${formatCell(r[c])}</td>`).join('')}<td>${!mod.readonly && api.canWrite(state.user,name)?`<button class="icon-btn" onclick="openForm('${name}','${r.id}')">Edit</button><button class="icon-btn danger" onclick="deleteRecord('${name}','${r.id}')">Delete</button>`:'Read only'}</td></tr>`).join('') || `<tr><td class="empty" colspan="${activeCols.length+2}">No records found.</td></tr>`}</tbody></table></div>`;
}
function formatCell(v){
  const x = html(Array.isArray(v)?v.join(', '):v);
  if(['active','published','verified'].includes(x)) return `<span class="badge active">${x}</span>`;
  if(['draft','pending','scheduled','paused'].includes(x)) return `<span class="badge draft">${x}</span>`;
  if(['inactive','expired','closed','rejected','archived'].includes(x)) return `<span class="badge inactive">${x}</span>`;
  return x;
}
function renderMedia(){
  const rows = rowsFor('media');
  $('content').innerHTML = `<div class="breadcrumbs">Dashboard / Media Library</div><div class="page-head"><div><h1>Media Library</h1><p class="muted">Drag/drop images or videos to upload into Firebase Storage. Thumbnails are generated automatically.</p></div></div><div class="upload-zone" id="dropZone"><strong>Drop files here</strong><span>or choose multiple images/videos</span><input id="filePicker" type="file" multiple accept="image/*,video/*"><progress id="uploadProgress" max="100" value="0"></progress><small id="uploadLabel">Waiting for files…</small></div>${toolbar('media')}<div class="media-grid">${rows.map(r=>`<article class="media-card"><input type="checkbox" ${state.selected.has(r.id)?'checked':''} onchange="toggleOne('${r.id}',this.checked)"><div class="thumb">${r.type==='video'?`<video src="${attr(r.url)}" poster="${attr(r.thumbnailUrl || '')}" muted></video>`:`<img src="${attr(r.thumbnailUrl || r.url || '')}" alt="${attr(r.altText || r.title || '')}">`}</div><h3>${html(r.title)}</h3><p>${html(r.mimeType || r.type)} · ${Math.round((Number(r.sizeBytes)||0)/1024)} KB</p><button class="icon-btn" onclick="openMediaDetails('${r.id}')">Edit details</button><button class="icon-btn" onclick="replaceMedia('${r.id}')">Replace</button><button class="icon-btn danger" onclick="deleteMedia('${r.id}')">Delete</button></article>`).join('') || '<div class="empty">No media in Firestore yet.</div>'}</div>`;
  bindUpload();
}
function bindUpload(){
  const dz=$('dropZone'), picker=$('filePicker'); if(!dz || dz.dataset.bound) return; dz.dataset.bound='1';
  picker.onchange=()=>uploadFiles([...picker.files]);
  ['dragenter','dragover'].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault();dz.classList.add('drag')}));
  ['dragleave','drop'].forEach(evt=>dz.addEventListener(evt,e=>{e.preventDefault();dz.classList.remove('drag')}));
  dz.addEventListener('drop',e=>uploadFiles([...e.dataTransfer.files]));
}
async function uploadFiles(files){
  if(!files.length) return;
  for(const file of files){
    try{ await api.uploadMediaFile(file,state.user,{},(pct,name)=>{ $('uploadProgress').value=pct; $('uploadLabel').textContent=`${name}: ${pct}%`; }); }
    catch(e){ toast(e.message,'bad'); }
  }
  $('uploadProgress').value=0; $('uploadLabel').textContent='Upload complete'; toast('Media uploaded');
}
window.openForm = function(name,id=''){
  const mod=modules[name]; const record=id?(state.data[name]||[]).find(r=>r.id===id):{};
  $('modal').hidden=false;
  $('modal').innerHTML=`<div class="modal-card"><div class="modal-head"><h2>${id?'Edit':'Create'} ${mod.singular}</h2><button class="icon-btn" onclick="closeModal()">✕</button></div><form id="recordForm" class="form-grid">${mod.fields.map(f=>field(f,record?.[f[0]])).join('')}<button class="btn btn-primary span" type="submit">Save ${mod.singular}</button></form></div>`;
  $('recordForm').onsubmit=async e=>{ e.preventDefault(); const formData = new FormData(e.currentTarget); const data=Object.fromEntries(formData.entries()); if(name==='companies') await hydrateCompanyUploads(data, formData); if(data.tags) data.tags=data.tags.split(',').map(t=>t.trim()).filter(Boolean); if(data.galleryUrls) data.galleryUrls=data.galleryUrls.split(',').map(t=>t.trim()).filter(Boolean); if(!data.slug && data.title) data.slug=api.slugify(data.title); try{ await api.saveRecord(name,id,data,state.user); closeModal(); toast('Saved to Firestore'); }catch(err){ toast(err.message,'bad'); } };
};
async function hydrateCompanyUploads(data, formData){
  const logo = formData.get('logoUpload');
  const cover = formData.get('coverUpload');
  const gallery = formData.getAll('galleryUpload').filter(f=>f && f.size);
  delete data.logoUpload; delete data.coverUpload; delete data.galleryUpload;
  if(logo && logo.size){ const uploaded = await api.uploadMediaFile(logo,state.user,{title:`Company logo - ${data.name || 'profile'}`},()=>{}); data.logoUrl = uploaded.url || data.logoUrl; }
  if(cover && cover.size){ const uploaded = await api.uploadMediaFile(cover,state.user,{title:`Company cover - ${data.name || 'profile'}`},()=>{}); data.coverUrl = uploaded.url || data.coverUrl; }
  if(gallery.length){ const urls=[]; for(const file of gallery){ const uploaded = await api.uploadMediaFile(file,state.user,{title:`Company gallery - ${file.name}`},()=>{}); if(uploaded.url) urls.push(uploaded.url); } data.galleryUrls = [...(data.galleryUrls?data.galleryUrls.split(',').map(x=>x.trim()).filter(Boolean):[]), ...urls].join(','); }
}
function field([name,label,type,options],value=''){
  if(type==='file') return `<label class="field"><span>${label}</span><input name="${name}" type="file" accept="image/*,video/*"></label>`;
  if(type==='file-multiple') return `<label class="field span"><span>${label}</span><input name="${name}" type="file" accept="image/*,video/*" multiple></label>`;
  if(type==='select') return `<label class="field"><span>${label}</span><select name="${name}">${options.map(o=>`<option ${value===o?'selected':''} value="${o}">${o}</option>`).join('')}</select></label>`;
  if(type==='textarea') return `<label class="field span"><span>${label}</span><textarea name="${name}">${html(value)}</textarea></label>`;
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${attr(type.includes('date')?dateValue(value):value)}"></label>`;
}
window.openMediaDetails = id => {
  const record=(state.data.media||[]).find(r=>r.id===id) || {};
  const mod = { singular:'Media', fields:[['title','Title','text'],['altText','Alt Text','text'],['status','Status','select',['active','inactive']],['metadata','Metadata Notes','textarea']] };
  $('modal').hidden=false;
  $('modal').innerHTML=`<div class="modal-card"><div class="modal-head"><h2>Edit Media Details</h2><button class="icon-btn" onclick="closeModal()">✕</button></div><form id="recordForm" class="form-grid">${mod.fields.map(f=>field(f, typeof record[f[0]] === 'object' ? JSON.stringify(record[f[0]]) : record[f[0]])).join('')}<button class="btn btn-primary span" type="submit">Save Media</button></form></div>`;
  $('recordForm').onsubmit=async e=>{ e.preventDefault(); const data=Object.fromEntries(new FormData(e.currentTarget).entries()); try{ await api.saveRecord('media',id,data,state.user); closeModal(); toast('Media details saved'); }catch(err){ toast(err.message,'bad'); } };
};
window.replaceMedia = id => { const input=document.createElement('input'); input.type='file'; input.accept='image/*,video/*'; input.onchange=async()=>{ const record=(state.data.media||[]).find(r=>r.id===id); try{ await api.replaceMediaFile(record,input.files[0],state.user,(pct)=>toast(`Replacing media: ${pct}%`)); toast('Media replaced'); }catch(e){ toast(e.message,'bad'); } }; input.click(); };
window.deleteMedia = async id => { if(!confirm('Delete this media from Storage and Firestore?')) return; const record=(state.data.media||[]).find(r=>r.id===id); try{ await api.deleteMedia(record,state.user); toast('Media deleted'); }catch(e){ toast(e.message,'bad'); } };
window.deleteRecord = async (name,id)=>{ if(!confirm('Delete this record?')) return; try{ await api.removeRecord(name,id,state.user); toast('Deleted'); }catch(e){ toast(e.message,'bad'); } };
window.bulkDelete = async name=>{ const ids=[...state.selected]; if(!ids.length) return toast('Select records first','bad'); if(!confirm(`Delete ${ids.length} selected records?`)) return; try{ if(name==='media'){ for(const id of ids){ const r=(state.data.media||[]).find(x=>x.id===id); if(r) await api.deleteMedia(r,state.user); } } else await api.bulkRemove(name,ids,state.user); state.selected.clear(); toast('Bulk delete complete'); }catch(e){ toast(e.message,'bad'); } };
window.toggleOne=(id,on)=>{ on?state.selected.add(id):state.selected.delete(id); };
window.toggleAll=(name,on)=>{ rowsFor(name).forEach(r=>on?state.selected.add(r.id):state.selected.delete(r.id)); render(); };
window.closeModal=()=>{ $('modal').hidden=true; $('modal').innerHTML=''; };
window.state=state;
init();
window.render = render;
