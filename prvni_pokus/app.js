// --- JSONBin.io Config ---
const JSONBIN_API_KEY = '$2a$10$dM5iO9SaL9gPAbeqbZE2veGdxhglzGXyCb5KzLQZbznibrz1VFSKu';
const JSONBIN_BIN_ID  = '$2a$10$rpU7scUXWCXKkafuGsrL8uTPptjdR3k8WjJ1f/Hnj6YOa7VyvWEDm';
const JSONBIN_URL     = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

async function readDB() {
  const res = await fetch(JSONBIN_URL + '/latest', {
    headers: { 'X-Master-Key': JSONBIN_API_KEY }
  });
  const json = await res.json();
  return json.record; // { users: {}, scans: [] }
}

async function writeDB(data) {
  await fetch(JSONBIN_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSONBIN_API_KEY
    },
    body: JSON.stringify(data)
  });
}

// --- Sidebar & Navigation ---
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('nav ul li');

menuToggle.addEventListener('click', ()=> sidebar.classList.toggle('open'));
navItems.forEach(item=>{
    item.addEventListener('click', ()=>{
        const viewId = item.dataset.view;
        views.forEach(v=>v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        sidebar.classList.remove('open');
        if(viewId==='history') loadHistory();
        if(viewId==='teacher') loadTeacherDashboard();
    });
});

// --- Login ---
let currentUser = null;
const loginForm = document.getElementById('loginForm');
const loginOutput = document.getElementById('loginOutput');

loginForm.addEventListener('submit', e=>{
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    if(username && password){
        currentUser = username;
        loginOutput.textContent = "Přihlášeno jako: " + currentUser;
        views.forEach(v=>v.classList.remove('active'));
        document.getElementById('home').classList.add('active');
    } else {
        loginOutput.textContent = "Vyplň jméno a heslo!";
    }
});

// --- QR Scanner ---
let video = document.getElementById('video');
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let scanOutput = document.getElementById('scanOutput');
let scanning = false;

document.getElementById('startScan').addEventListener('click', ()=>{
    if(scanning) return;
    scanning = true;
    startCamera();
});

function startCamera(){
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(stream=>{
        video.srcObject = stream;
        requestAnimationFrame(scanFrame);
    })
    .catch(err=>{
        scanOutput.textContent = "Nelze spustit kameru: "+err;
    });
}

function scanFrame(){
    if(!scanning) return;
    if(video.readyState===video.HAVE_ENOUGH_DATA){
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video,0,0,canvas.width,canvas.height);
        const imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
        const code = jsQR(imageData.data,imageData.width,imageData.height);
        if(code){
            const timestamp = new Date().toLocaleTimeString();
            scanOutput.textContent = `Naskenováno: ${code.data}`;
            saveScanData({ user: currentUser, data: code.data, time: timestamp });
            scanning = false;
            setTimeout(()=> scanning = true, 2000);
        }
    }
    requestAnimationFrame(scanFrame);
}

// --- Scan Data ---
async function saveScanData(scanEntry) {
    try {
        const db = await readDB();
        db.scans.push(scanEntry);
        await writeDB(db);
    } catch(err) {
        console.error('Chyba při ukládání skenu:', err);
    }
}

async function loadHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '<li>Načítám...</li>';
    try {
        const db = await readDB();
        list.innerHTML = '';
        const userScans = db.scans.filter(d => d.user === currentUser);
        if(userScans.length === 0){
            list.innerHTML = '<li>Žádné skeny zatím.</li>';
            return;
        }
        userScans.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.time} – ${item.data}`;
            list.appendChild(li);
        });
    } catch(err) {
        list.innerHTML = '<li>Chyba při načítání.</li>';
    }
}

// --- Geolokace ---
let locationOutput = document.getElementById('locationOutput');
let locationTimeout = null;

async function updateLocation(){
    if(!currentUser || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async pos=>{
        const coords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            time: new Date().toLocaleTimeString()
        };
        locationOutput.textContent = `Šířka: ${coords.lat}, Délka: ${coords.lon} (čas: ${coords.time})`;
        try {
            const db = await readDB();
            db.users[currentUser] = coords;
            await writeDB(db);
        } catch(err) {
            console.error('Chyba při ukládání polohy:', err);
        }
    });
}

// Aktualizace polohy každých 60 sekund (JSONBin má rate limit)
setInterval(updateLocation, 60000);

// --- Teacher Dashboard ---
async function loadTeacherDashboard() {
    const list = document.getElementById('teacherList');
    list.innerHTML = '<li>Načítám...</li>';
    try {
        const db = await readDB();
        list.innerHTML = '';
        const entries = Object.entries(db.users);
        if(entries.length === 0){
            list.innerHTML = '<li>Žádní uživatelé zatím.</li>';
            return;
        }
        entries.forEach(([user, coords]) => {
            const scans = db.scans.filter(d => d.user === user);
            const li = document.createElement('li');
            li.innerHTML = `<strong>${user}</strong><br>
                Poloha: ${coords.lat}, ${coords.lon}<br>
                Čas: ${coords.time}<br>
                QR naskenováno: ${scans.length}`;
            list.appendChild(li);
        });
    } catch(err) {
        list.innerHTML = '<li>Chyba při načítání dashboardu.</li>';
    }
}
