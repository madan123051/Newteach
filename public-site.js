const api = window.NewTechFirebase;
const $ = sel => document.querySelector(sel);
const h = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state = { companies:[], media:[], news:[], blogs:[], jobs:[], ads:[] };
function published(rows){
  const now = Date.now();
  return rows.filter(r=>['published','active','verified'].includes(r.status || '') && (!r.publishAt || new Date(r.publishAt).getTime() <= now) && (!r.startAt || new Date(r.startAt).getTime() <= now) && (!r.endAt || new Date(r.endAt).getTime() >= now));
}
function firstCompany(){ return published(state.companies)[0] || state.companies[0] || {}; }
function img(url, alt){ return url ? `<img src="${h(url)}" alt="${h(alt)}" loading="lazy">` : `<div class="placeholder">No image uploaded</div>`; }
function render(){
  const company = firstCompany();
  const media = published(state.media).filter(m=>m.type === 'image' || m.type === 'video');
  const hero = company.coverUrl || media[0]?.url;
  document.title = `${company.name || 'NewTech'} – Live Firestore Website`;
  $('#brandName').innerHTML = h(company.name || 'NewTech');
  $('#hero').innerHTML = `<div class="hero-container"><div class="hero-content fade-up visible"><div class="section-label">${h(company.category || 'Company Profile')}</div><h1>${h(company.name || 'Content loading from Firestore')}</h1><p class="hero-tagline">${h(company.tagline || 'Website content is managed from the admin dashboard')}</p><p>${h(company.description || 'Add a verified company profile in Firestore to populate this public website.')}</p><div class="hero-btns"><a href="#contact" class="btn-primary">Contact Us →</a><a href="#news" class="btn-secondary">Latest Updates</a></div></div><div class="hero-image fade-up visible">${img(hero, company.name || 'Company cover')}</div></div>`;
  $('#aboutBody').innerHTML = `<div class="about-image fade-up visible">${img(company.logoUrl || media[1]?.url, company.name || 'Logo')}</div><div class="about-content fade-up visible"><div class="section-label">About Us</div><h2>${h(company.name || 'Company profile')}</h2><p>${h(company.description || 'Company details are empty. Update the Company Profile module in the admin dashboard.')}</p><p>${h(company.address || '')}</p></div>`;
  $('#galleryGrid').innerHTML = media.slice(0,9).map(m=>`<article class="gallery-item fade-up visible">${m.type==='video'?`<video src="${h(m.url)}" poster="${h(m.thumbnailUrl || '')}" controls muted></video>`:img(m.url,m.altText||m.title)}<div class="gallery-overlay"><h4>${h(m.title)}</h4></div></article>`).join('') || '<p class="empty">No published media yet.</p>';
  $('#adsGrid').innerHTML = published(state.ads).map(ad=>`<article class="content-card">${ad.videoUrl?`<video src="${h(ad.videoUrl)}" controls poster="${h(ad.bannerUrl || '')}"></video>`:img(ad.bannerUrl,ad.title)}<h3>${h(ad.title)}</h3><a href="${h(ad.destinationUrl || '#')}" class="product-link">Open ad →</a></article>`).join('') || '<p class="empty">No scheduled advertisements are active.</p>';
  $('#newsGrid').innerHTML = published(state.news).map(n=>card(n)).join('') || '<p class="empty">No published news.</p>';
  $('#blogsGrid').innerHTML = published(state.blogs).map(b=>card(b, true)).join('') || '<p class="empty">No published blog posts.</p>';
  $('#jobsGrid').innerHTML = published(state.jobs).map(j=>`<article class="content-card"><h3>${h(j.title)}</h3><p>${h(j.department || '')} · ${h(j.location || '')}</p><p>${h(j.description || '')}</p><span class="pill">${h(j.status)}</span><span class="pill">${Number(j.applicationCount || 0)} applications</span></article>`).join('') || '<p class="empty">No active job vacancies.</p>';
  $('#contactInfo').innerHTML = `<div class="contact-item"><div class="contact-icon">📍</div><div><h4>Office</h4><p>${h(company.address || 'Add address in Firestore')}</p></div></div><div class="contact-item"><div class="contact-icon">📞</div><div><h4>Call</h4><p>${h(company.phone || 'Add phone in Firestore')}</p></div></div><div class="contact-item"><div class="contact-icon">✉️</div><div><h4>Email</h4><p>${h(company.email || 'Add email in Firestore')}</p></div></div><div class="contact-item"><div class="contact-icon">🌐</div><div><h4>Website</h4><p>${h(company.website || '')}</p></div></div>`;
  $('#footerBrand').textContent = company.name || 'NewTech';
}
function card(item, blog=false){ return `<article class="content-card">${img(item.imageUrl,item.title)}<div class="card-body"><span class="pill">${h(blog?(item.category||'Blog'):'News')}</span><h3>${h(item.title)}</h3><p>${h(item.summary || item.seoDescription || item.content || '')}</p>${blog && item.tags?.length?`<p>${item.tags.map(t=>`<span class="pill">${h(t)}</span>`).join('')}</p>`:''}</div></article>`; }
function init(){
  if(!api.configured){
    $('#firebaseStatus').hidden=false;
    render();
    return;
  }
  ['companies','media','news','blogs','jobs','ads'].forEach(name=>api.subscribeCollection(name,(rows,error)=>{ if(!error){ state[name]=rows; render(); } }));
  document.getElementById('contactForm').addEventListener('submit', e=>{ e.preventDefault(); alert('Thanks. Connect a leads collection if you want to persist enquiries.'); e.currentTarget.reset(); });
}
init();
