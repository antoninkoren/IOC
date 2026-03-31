import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'TVUJ_SUPABASE_URL'
const supabaseAnonKey = 'TVUJ_SUPABASE_ANON_KEY'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

let currentUser = null

// Přihlášení / registrace
export async function prihlaseni() {
  const nick = document.getElementById('nick').value.trim()
  if (!nick) { alert('Zadej nick!'); return; }

  let { data, error } = await supabase
    .from('ucitele')
    .select('*')
    .eq('nick', nick)
    .single()

  if (error && error.code === 'PGRST116') {
    let { data: newUser, error: insertError } = await supabase
      .from('ucitele')
      .insert([{ nick: nick }])
      .select()
      .single()
    if (insertError) { console.error(insertError); alert('Chyba při registraci'); return; }
    currentUser = newUser
  } else if (data) {
    currentUser = data
  } else { console.error(error); return }

  document.getElementById('loginDiv').style.display = 'none'
  document.getElementById('dashboard').style.display = 'block'
  document.getElementById('userNick').textContent = currentUser.nick
  document.getElementById('logoutBtn').style.display = 'inline-block'

  nactiMapy()
}

// Odhlášení
export function odhlaseni() {
  currentUser = null
  document.getElementById('loginDiv').style.display = 'block'
  document.getElementById('dashboard').style.display = 'none'
  document.getElementById('logoutBtn').style.display = 'none'
  document.getElementById('nick').value = ''
}

// Přidání mapy
export async function ulozMapu() {
  const nazevMapy = document.getElementById('mapaNazev').value.trim()
  if (!nazevMapy) { alert('Zadej název mapy!'); return; }

  const { data, error } = await supabase
    .from('mapy')
    .insert([{ autor: currentUser.nick, nazev: nazevMapy, datum: new Date().toISOString() }])
  if (error) { console.error(error); alert('Chyba při ukládání mapy'); return; }

  document.getElementById('mapaNazev').value = ''
  nactiMapy()
}

// Načtení map
async function nactiMapy() {
  const { data, error } = await supabase
    .from('mapy')
    .select('*')
    .eq('autor', currentUser.nick)
    .order('datum', { ascending: false })

  if (error) { console.error(error); return; }

  const list = document.getElementById('mapyList')
  list.innerHTML = ''

  data.forEach(mapa => {
    const card = document.createElement('div')
    card.className = 'mapa-card'
    card.innerHTML = `<h4>${mapa.nazev}</h4><small>${new Date(mapa.datum).toLocaleString()}</small>`

    const delBtn = document.createElement('button')
    delBtn.innerHTML = '<i class="fas fa-trash"></i>'
    delBtn.onclick = () => smazMapu(mapa.id)
    card.appendChild(delBtn)

    list.appendChild(card)
  })

  document.getElementById('mapCount').textContent = data.length
}

// Smazání mapy
async function smazMapu(id) {
  const { error } = await supabase
    .from('mapy')
    .delete()
    .eq('id', id)
  if (error) { console.error(error); alert('Chyba při mazání'); return; }
  nactiMapy()
}
