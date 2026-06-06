import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js';

const requiredCollections = ['users','companies','media','news','blogs','jobs','ads','activityLogs'];
const config = window.NEWTECH_FIREBASE_CONFIG || {};
const configured = Boolean(config.apiKey && config.projectId && config.storageBucket);
const app = configured ? initializeApp(config) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const storage = app ? getStorage(app) : null;

const rolePermissions = {
  'Super Admin': requiredCollections,
  'Company Admin': ['companies','media','news','blogs','jobs','ads','activityLogs'],
  Editor: ['media','news','blogs'],
};
const writeActions = {
  'Super Admin': requiredCollections,
  'Company Admin': ['companies','media','news','blogs','jobs','ads'],
  Editor: ['media','news','blogs'],
};

function assertConfigured(){
  if(!configured) throw new Error('Firebase is not configured. Fill firebase-config.js before using live database, storage, or auth features.');
}
function clean(value){
  if(value === undefined) return null;
  if(value instanceof File) return undefined;
  if(Array.isArray(value)) return value.map(clean).filter(v=>v!==undefined);
  if(value && typeof value === 'object' && !(value instanceof Date)){
    return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v)]).filter(([,v])=>v!==undefined));
  }
  return value;
}
function normalizeDate(value){
  if(!value) return '';
  if(value instanceof Timestamp) return value.toDate().toISOString();
  if(value.toDate) return value.toDate().toISOString();
  return String(value);
}
function normalizeDoc(snap){
  const data = snap.data() || {};
  return {
    id: snap.id,
    ...data,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
    publishAt: normalizeDate(data.publishAt),
    startAt: normalizeDate(data.startAt),
    endAt: normalizeDate(data.endAt),
    expiryDate: normalizeDate(data.expiryDate),
  };
}
function canRead(user, collectionName){
  return Boolean(user && (rolePermissions[user.role] || []).includes(collectionName));
}
function canWrite(user, collectionName){
  return Boolean(user && (writeActions[user.role] || []).includes(collectionName));
}
async function getUserProfile(firebaseUser){
  assertConfigured();
  const byUid = await getDoc(doc(db,'users',firebaseUser.uid));
  if(byUid.exists()) return { id: byUid.id, uid: firebaseUser.uid, email: firebaseUser.email, ...byUid.data() };
  const byEmail = await getDocs(query(collection(db,'users'), where('email','==',firebaseUser.email)));
  if(!byEmail.empty){
    const first = byEmail.docs[0];
    return { id:first.id, uid:firebaseUser.uid, email:firebaseUser.email, ...first.data() };
  }
  return { id: firebaseUser.uid, uid: firebaseUser.uid, email: firebaseUser.email, name: firebaseUser.email, role: 'Editor', status: 'inactive' };
}
async function logActivity(user, action, entityType, entityId='', metadata={}){
  assertConfigured();
  await addDoc(collection(db,'activityLogs'), clean({
    action,
    entityType,
    entityId,
    metadata,
    actorUserId: user?.uid || user?.id || '',
    actorName: user?.name || user?.email || 'System',
    actorRole: user?.role || '',
    companyId: user?.companyId || null,
    userAgent: navigator.userAgent,
    createdAt: serverTimestamp()
  }));
}
function subscribeCollection(name, callback, constraints=[]){
  assertConfigured();
  const q = constraints.length ? query(collection(db,name), ...constraints) : query(collection(db,name), orderBy('updatedAt','desc'));
  return onSnapshot(q, snap => callback(snap.docs.map(normalizeDoc)), error => callback([], error));
}
async function saveRecord(name, id, data, user){
  assertConfigured();
  if(!canWrite(user,name)) throw new Error(`Your role cannot write to ${name}.`);
  const payload = clean({ ...data, updatedAt: serverTimestamp(), updatedBy: user.uid || user.id, companyId: data.companyId || user.companyId || null });
  if(id){
    await updateDoc(doc(db,name,id), payload);
    await logActivity(user,'Edit',name,id,{ title:data.title || data.name || '' });
    return id;
  }
  const created = await addDoc(collection(db,name), { ...payload, createdAt: serverTimestamp(), createdBy: user.uid || user.id });
  await logActivity(user,'Create',name,created.id,{ title:data.title || data.name || '' });
  return created.id;
}
async function removeRecord(name, id, user){
  assertConfigured();
  if(!canWrite(user,name)) throw new Error(`Your role cannot delete from ${name}.`);
  await deleteDoc(doc(db,name,id));
  await logActivity(user,'Delete',name,id);
}
async function bulkRemove(name, ids, user){
  await Promise.all(ids.map(id=>removeRecord(name,id,user)));
}
function slugify(input){
  return String(input || '').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function storagePath(file, folder, user){
  const safeName = file.name.replace(/[^a-z0-9_.-]/gi,'-').toLowerCase();
  const company = user?.companyId || 'global';
  return `${folder}/${company}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}
function canvasBlob(canvas, type='image/jpeg', quality=.78){
  return new Promise(resolve=>canvas.toBlob(resolve,type,quality));
}
async function imageThumbnail(file){
  if(!file.type.startsWith('image/')) return null;
  const bitmap = await createImageBitmap(file);
  const max = 420;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  return canvasBlob(canvas);
}
async function videoThumbnail(file){
  if(!file.type.startsWith('video/')) return null;
  const url = URL.createObjectURL(file);
  try{
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise((resolve,reject)=>{ video.onloadeddata=resolve; video.onerror=reject; });
    video.currentTime = Math.min(1, video.duration || 1);
    await new Promise(resolve=>{ video.onseeked=resolve; setTimeout(resolve,900); });
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = Math.max(1, Math.round((video.videoHeight/video.videoWidth)*420) || 236);
    canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
    return canvasBlob(canvas);
  } finally { URL.revokeObjectURL(url); }
}
async function uploadMediaFile(file, user, details={}, onProgress=()=>{}){
  assertConfigured();
  if(!canWrite(user,'media')) throw new Error('Your role cannot upload media.');
  const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'file';
  const fileRef = ref(storage, storagePath(file, 'media', user));
  const task = uploadBytesResumable(fileRef, file, { contentType: file.type, customMetadata: { uploadedBy: user.uid || user.id || '' } });
  await new Promise((resolve,reject)=>{
    task.on('state_changed', snap=>onProgress(Math.round((snap.bytesTransferred/snap.totalBytes)*100), file.name), reject, resolve);
  });
  const url = await getDownloadURL(fileRef);
  let thumbnailUrl = '';
  let thumbnailPath = '';
  const thumb = type === 'image' ? await imageThumbnail(file) : await videoThumbnail(file);
  if(thumb){
    const thumbRef = ref(storage, storagePath(new File([thumb], `${file.name}-thumb.jpg`, {type:'image/jpeg'}), 'thumbnails', user));
    await uploadBytesResumable(thumbRef, thumb, { contentType:'image/jpeg' });
    thumbnailUrl = await getDownloadURL(thumbRef);
    thumbnailPath = thumbRef.fullPath;
  }
  const id = await saveRecord('media', '', {
    title: details.title || file.name,
    altText: details.altText || details.title || file.name,
    type,
    mimeType: file.type,
    sizeBytes: file.size,
    storagePath: fileRef.fullPath,
    url,
    thumbnailUrl,
    thumbnailPath,
    metadata: details.metadata || {},
    status: 'active'
  }, user);
  await logActivity(user,'Media Upload','media',id,{ fileName:file.name, sizeBytes:file.size, mimeType:file.type });
  return { id, url, thumbnailUrl, storagePath: fileRef.fullPath, thumbnailPath };
}
async function replaceMediaFile(record, file, user, onProgress){
  const id = await uploadMediaFile(file, user, { title: record.title, altText: record.altText, metadata: record.metadata }, onProgress);
  await removeRecord('media', record.id, user);
  return id;
}
async function deleteMedia(record, user){
  assertConfigured();
  if(record.storagePath) await deleteObject(ref(storage, record.storagePath)).catch(()=>{});
  if(record.thumbnailPath) await deleteObject(ref(storage, record.thumbnailPath)).catch(()=>{});
  await removeRecord('media', record.id, user);
}

window.NewTechFirebase = {
  configured,
  auth,
  db,
  storage,
  requiredCollections,
  canRead,
  canWrite,
  getUserProfile,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  subscribeCollection,
  saveRecord,
  removeRecord,
  bulkRemove,
  uploadMediaFile,
  replaceMediaFile,
  deleteMedia,
  logActivity,
  slugify,
  where,
  orderBy,
  query,
};
