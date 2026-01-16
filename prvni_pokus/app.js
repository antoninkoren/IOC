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
        localStorage.setItem('currentUser', currentUser);
        loginOutput.textContent = "Přihlášeno jako: " + currentUser;
        // Po přihlášení přepnout na home
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
let scanData = JSON.parse(localStorage.getItem('scanHistory') || '[]');

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
            scanData.push({user:currentUser,data:code.data,time:timestamp});
            saveScanData();
            scanning = false;
            setTimeout(()=> scanning = true, 2000); // pauza 2s
        }
    }
    requestAnimationFrame(scanFrame);
}

// --- Historie ---
function saveScanData(){
    localStorage.setItem('scanHistory', JSON.stringify(scanData));
}

function loadHistory(){
    const list = document.getElementById('historyList');
    list.innerHTML='';
    const data = JSON.parse(localStorage.getItem('scanHistory')||'[]')
        .filter(d => d.user === currentUser);
    data.forEach(item=>{
        const li = document.createElement('li');
        li.textContent=`${item.time} – ${item.data}`;
        list.appendChild(li);
    });
}

// --- Geolokace ---
let locationOutput = document.getElementById('locationOutput');

function updateLocation(){
    if(currentUser && navigator.geolocation){
        navigator.geolocation.getCurrentPosition(pos=>{
            const coords = {lat: pos.coords.latitude, lon: pos.coords.longitude, time: new Date().toLocaleTimeString()};
            localStorage.setItem('userLocation_'+currentUser, JSON.stringify(coords));
            locationOutput.textContent = `Šířka: ${coords.lat}, Délka: ${coords.lon} (času: ${coords.time})`;
        });
    }
}
setInterval(updateLocation, 3000); // každé 3 sekundy

// --- Teacher Dashboard ---
function loadTeacherDashboard(){
    const list = document.getElementById('teacherList');
    list.innerHTML='';
    // Simulace: pro všechny uživatele, kteří mají uloženou polohu
    for(let key in localStorage){
        if(key.startsWith('userLocation_')){
            const user = key.replace('userLocation_','');
            const coords = JSON.parse(localStorage.getItem(key));
            const scans = JSON.parse(localStorage.getItem('scanHistory')||'[]')
                .filter(d => d.user === user);
            const li = document.createElement('li');
            li.innerHTML = `<strong>${user}</strong><br>Poloha: ${coords.lat}, ${coords.lon} <br>Čas: ${coords.time} <br>QR naskenováno: ${scans.length}`;
            list.appendChild(li);
        }
    }
}
