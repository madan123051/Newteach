import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATvwM_0B9ibtD9MniIoiIoiNuiirnC0mb2AY",
  authDomain: "newtechhomesolutions-b6ab6.firebaseapp.com",
  projectId: "newtechhomesolutions-b6ab6",
  storageBucket: "newtechhomesolutions-b6ab6.firebasestorage.app",
  messagingSenderId: "1015056454392",
  appId: "1:1015056454392:web:2d764c7f4e0f769407e10d",
  measurementId: "G-8HV2QWDK4W"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const demoGallery = [
  { title: "Pleated Mesh Installation", category: "Pleated Mesh", type: "photo", url: "https://image.qwenlm.ai/public_source/a9adada8-5a98-4894-9f2f-04d564115042/10700f531-e73e-4340-a35e-65f573516584.png" },
  { title: "Honeycomb Partition", category: "Honey Comb Partition", type: "photo", url: "https://image.qwenlm.ai/public_source/a9adada8-5a98-4894-9f2f-04d564115042/107062145-8162-4211-8288-0243e8e74f98.png" },
  { title: "Invisible Grill Security", category: "Invisible Grill", type: "photo", url: "https://image.qwenlm.ai/public_source/a9adada8-5a98-4894-9f2f-04d564115042/10f279581-3f9c-4860-84a1-0678a2212952.png" },
  { title: "Anti Bird Netting", category: "Anti Bird Net", type: "photo", url: "https://image.qwenlm.ai/public_source/a9adada8-5a98-4894-9f2f-04d564115042/10332f913-979b-4330-9759-335384666324.png" },
  { title: "Modern Balcony Setup", category: "Invisible Grill", type: "photo", url: "https://image.qwenlm.ai/public_source/a9adada8-5a98-4894-9f2f-04d564115042/109062331-5072-4682-8924-423573881451.png" },
  { title: "Premium Invisible Grill", category: "Invisible Grill", type: "photo", url: "https://image.qwenlm.ai/public_source/a9adada8-5a98-4894-9f2f-04d564115042/10d0ff845-07f4-46e8-b38f-ffb94cca9f65.png" }
];

const demoJobs = [
  { title: "Sales Executive", department: "Sales", description: "Looking for energetic sales professionals to handle customer inquiries and site visits.", status: "active", expiryDate: "2026-12-31" },
  { title: "Installation Technician", department: "Operations", description: "Experience in installing pleated mesh, invisible grills, and bird nets required.", status: "active", expiryDate: "2026-12-31" }
];

async function restore() {
  console.log("Starting restoration...");
  
  // Check if already has data to avoid duplicates
  const q = query(collection(db, "media"), limit(1));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log("Database already has data. Skipping restoration to avoid duplicates.");
    return;
  }

  for (const item of demoGallery) {
    await addDoc(collection(db, "media"), { ...item, createdAt: new Date().toISOString() });
    console.log(`Restored gallery item: ${item.title}`);
  }

  for (const job of demoJobs) {
    await addDoc(collection(db, "jobs"), { ...job, createdAt: new Date().toISOString() });
    console.log(`Restored job: ${job.title}`);
  }

  console.log("Restoration complete!");
}

restore();
