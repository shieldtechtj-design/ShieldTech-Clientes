const SUPABASE_URL = 'https://yhituochlrjmguxmrmeb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_VThU04wrSsdaEqP6tXwPPg_01f9EUT6'

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

function diasSinContacto(f) {
  if (!f) return null
  const hoy = new Date()
  const ultima = new Date(f)
  const diff = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24))
  return diff
}

function renderList() {
  const q = document.getElementById('search').value.toLowerCase()
  const st = document.getElementById('filtro').value
  const list = clients.filter(c => {
    const match = c.nombre.toLowerCase().includes(q) || (c.direccion||'').toLowerCase().includes(q) || (c.telefono||'').includes(q)
    return match && (!st || c.estatus === st)
  })
  const el = document.getElementById('client-list')
  if (!list.length) { el.innerHTML = '<p class="empty">Sin resultados</p>'; return }
  el.innerHTML = list.map(c => {
    const dias = diasSinContacto(c.ultimo_contacto)
    const diasColor = dias === null ? '#888' : dias > 7 ? '#ff5252' : dias > 3 ? '#f0a500' : '#00c853'
    const diasTexto = dias === null ? 'Sin registro' : dias === 0 ? 'Hoy' : `Hace ${dias} día${dias>1?'s':''}`
    const historial = Array.isArray(c.historial) ? c.historial : []
    return `
    <div class="client-card">
      <div class="card-top">
        <div class="card-name">
          <div class="avatar">${initials(c.nombre)}</div>
          <div>
            <div class="name-text">${c.nombre}</div>
            <div class="phone">${c.telefono || ''}</div>
          </div>
        </div>
        <span class="badge badge-${c.estatus}">${c.estatus}</span>
      </div>

      <div class="card-details">
        <div class="detail">📍 ${c.direccion ? `<a href="${c.direccion}" target="_blank" style="color:#aaa">Ver en Maps</a>` : '—'}</div>
        <div class="detail">📅 ${fmtFecha(c.fecha)}</div>
        <div class="detail">📷 ${c.camara || '—'}</div>
        <div class="detail">💵 $${Number(c.monto||0).toLocaleString()}</div>
        <div class="detail">🎯 ${c.etapa || 'nuevo lead'}</div>
        <div class="detail">📣 ${c.origen || '—'}</div>
        <div class="detail" style="color:${diasColor}">🕐 ${diasTexto}</div>
        ${c.proximo_contacto ? `<div class="detail">⏰ Contactar: ${fmtFecha(c.proximo_contacto)}</div>` : ''}
        ${c.tarea ? `<div class="detail" style="grid-column:1/-1">📋 ${c.tarea}</div>` : ''}
        ${c.notas ? `<div class="detail notas">📝 ${c.notas}</div>` : ''}
      </div>

      ${historial.length ? `
      <div class="historial">
        <div class="historial-title">Historial</div>
        ${historial.slice(-3).reverse().map(h => `
          <div class="historial-item">
            <span class="historial-fecha">${h.fecha}</span>
            <span>${h.nota}</span>
          </div>
        `).join('')}
      </div>` : ''}

      <div class="card-actions">
        <button onclick="editClient(Number(${c.id}))">✏️ Editar</button>
        <button onclick="agregarNota(Number(${c.id}))">💬 Nota</button>
        <button onclick="abrirWhatsapp('${c.telefono}')">📱 WA</button>
        <button onclick="toggleStatus(Number(${c.id}))">🔄 Estatus</button>
        <button onclick="deleteClient(Number(${c.id}))" class="del">🗑</button>
      </div>
    </div>
  `}).join('')
}

function abrirWhatsapp(tel) {
  if (!tel) { alert('Este cliente no tiene teléfono registrado'); return }
  const numero = tel.replace(/\D/g, '')
  window.open(`https://wa.me/52${numero}`, '_blank')
}

async function agregarNota(id) {
  const nota = prompt('¿Qué pasó en este contacto?')
  if (!nota) return
  const cliente = clients.find(x => x.id === id)
  const historial = Array.isArray(cliente.historial) ? cliente.historial : []
  const hoy = new Date().toLocaleDateString('es-MX')
  historial.push({ fecha: hoy, nota })
  await sb.from('clientes').update({
    historial,
    ultimo_contacto: new Date().toISOString().split('T')[0]
  }).eq('id', id)
  await fetchClients()
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
    document.getElementById('f-origen').value = c.origen || ''
    document.getElementById('f-etapa').value = c.etapa || 'nuevo lead'
    document.getElementById('f-proximo').value = c.proximo_contacto || ''
    document.getElementById('f-tarea').value = c.tarea || ''
  } else {
    ['f-nombre','f-telefono','f-direccion','f-fecha','f-monto','f-notas','f-tarea'].forEach(x => document.getElementById(x).value = '')
    document.getElementById('f-camara').value = ''
    document.getElementById('f-estatus').value = 'pendiente'
    document.getElementById('f-origen').value = ''
    document.getElementById('f-etapa').value = 'nuevo lead'
    document.getElementById('f-proximo').value = ''
  }
  document.querySelector('.app').style.display = 'none'
  document.getElementById('form-view').style.display = 'block'
}

function editClient(id) {
  const client = clients.find(x => Number(x.id) === Number(id))
  if (!client) return
  editingId = Number(id)
  showForm(Number(id))
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
    origen: document.getElementById('f-origen').value,
    etapa: document.getElementById('f-etapa').value,
    proximo_contacto: document.getElementById('f-proximo').value || null,
    tarea: document.getElementById('f-tarea').value.trim(),
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
