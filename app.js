const SUPABASE_URL = 'https://yhituochlrjmguxmrmeb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_VThU04wrSsdaEqP6tXwPPg_O1f9EUT6'

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
let clients = []
let editingId = null

async function init() {
  await fetchClients()
}

async function fetchClients() {
  const { data } = await sb.from('clientes').select('*').order('created_at', { ascending: false })
  clients = data || []
  renderList()
  updateStats()
}

function updateStats() {
  document.getElementById('stat-total').textContent = clients.length
  document.getElementById('stat-inst').textContent = clients.filter(c => c.estatus === 'instalado').length
  document.getElementById('stat-pend').textContent = clients.filter(c => c.estatus === 'pendiente').length
}

function initials(n) { return n.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() }

function fmtFecha(f) { if (!f) return '—'; const [y,m,d] = f.split('-'); return `${d}/${m}/${y}` }

function renderList() {
  const q = document.getElementById('search').value.toLowerCase()
  const st = document.getElementById('filtro').value
  const list = clients.filter(c => {
    const match = c.nombre.toLowerCase().includes(q) || (c.direccion||'').toLowerCase().includes(q) || (c.telefono||'').includes(q)
    return match && (!st || c.estatus === st)
  })
  const el = document.getElementById('client-list')
  if (!list.length) { el.innerHTML = '<p class="empty">Sin resultados</p>'; return }
  el.innerHTML = list.map(c => `
    <div class="client-card">
      <div class="card-top">
        <div class="card-name">
          <div class="avatar">${initials(c.nombre)}</div>
          <div><div class="name-text">${c.nombre}</div><div class="phone">${c.telefono || ''}</div></div>
        </div>
        <span class="badge badge-${c.estatus}">${c.estatus}</span>
      </div>
      <div class="card-details">
        <div class="detail">📍 ${c.direccion ? `<a href="${c.direccion}" target="_blank" style="color:#aaa">Ver en Maps</a>` : '—'}</div>
        <div class="detail">📅 ${fmtFecha(c.fecha)}</div>
        <div class="detail">📷 ${c.camara || '—'}</div>
        <div class="detail">💵 $${Number(c.monto||0).toLocaleString()}</div>
        ${c.notas ? `<div class="detail notas">📝 ${c.notas}</div>` : ''}
      </div>
      <div class="card-actions">
        <button onclick="editClient(Number(${c.id}))">✏️ Editar</button>
        <button onclick="toggleStatus(${c.id})">🔄 Estatus</button>
        <button onclick="deleteClient(${c.id})" class="del">🗑 Eliminar</button>
      </div>
    </div>
  `).join('')
}
function editClient(id) {
  const client = clients.find(x => Number(x.id) === Number(id))
  if (!client) return
  editingId = Number(id)
  document.getElementById('form-title').textContent = 'Editar cliente'
  document.getElementById('f-nombre').value = client.nombre
  document.getElementById('f-telefono').value = client.telefono || ''
  document.getElementById('f-direccion').value = client.direccion || ''
  document.getElementById('f-fecha').value = client.fecha || ''
  document.getElementById('f-monto').value = client.monto || ''
  document.getElementById('f-camara').value = client.camara || ''
  document.getElementById('f-estatus').value = client.estatus
  document.getElementById('f-notas').value = client.notas || ''
  document.querySelector('.app').style.display = 'none'
  document.getElementById('form-view').style.display = 'block'
}
function showForm(id) {
  editingId = id || null
  document.getElementById('form-title').textContent = id ? 'Editar cliente' : 'Nuevo cliente'
  if (id) {
    const c = clients.find(x => x.id === id)
    document.getElementById('f-nombre').value = c.nombre
    document.getElementById('f-telefono').value = c.telefono || ''
    document.getElementById('f-direccion').value = c.direccion || ''
    document.getElementById('f-fecha').value = c.fecha || ''
    document.getElementById('f-monto').value = c.monto || ''
    document.getElementById('f-camara').value = c.camara || ''
    document.getElementById('f-estatus').value = c.estatus
    document.getElementById('f-notas').value = c.notas || ''
  } else {
    ['f-nombre','f-telefono','f-direccion','f-fecha','f-monto','f-notas'].forEach(x => document.getElementById(x).value = '')
    document.getElementById('f-camara').value = ''
    document.getElementById('f-estatus').value = 'pendiente'
  }
  document.querySelector('.app').style.display = 'none'
  document.getElementById('form-view').style.display = 'block'
}

function hideForm() {
  document.getElementById('form-view').style.display = 'none'
  document.querySelector('.app').style.display = 'block'
}

async function saveClient() {
  const nombre = document.getElementById('f-nombre').value.trim()
  if (!nombre) { alert('El nombre es obligatorio'); return }
  const data = {
    nombre,
    telefono: document.getElementById('f-telefono').value.trim(),
    direccion: document.getElementById('f-direccion').value.trim(),
    fecha: document.getElementById('f-fecha').value || null,
    monto: document.getElementById('f-monto').value || null,
    camara: document.getElementById('f-camara').value,
    estatus: document.getElementById('f-estatus').value,
    notas: document.getElementById('f-notas').value.trim(),
  }
  if (editingId) {
    await sb.from('clientes').update(data).eq('id', Number(editingId))
  } else {
    await sb.from('clientes').insert(data)
  }
  hideForm()
  await fetchClients()
}

async function deleteClient(id) {
  if (!confirm('¿Eliminar este cliente?')) return
  await sb.from('clientes').delete().eq('id', id)
  await fetchClients()
}

async function toggleStatus(id) {
  const order = ['pendiente','instalado','garantia']
  const c = clients.find(x => x.id === id)
  const next = order[(order.indexOf(c.estatus) + 1) % order.length]
  await sb.from('clientes').update({ estatus: next }).eq('id', id)
  await fetchClients()
}

init()
