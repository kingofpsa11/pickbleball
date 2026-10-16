const base = 'http://127.0.0.1:8788'

async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(8000) })
  const type = response.headers.get('content-type') ?? ''
  const text = await response.text()
  return { status: response.status, type, text }
}

const pages = ['/', '/lich-su', '/giai/t-hn', '/ban-to-chuc', '/ban-to-chuc/dang-nhap']
for (const path of pages) {
  const page = await get(path)
  if (page.status !== 200 || !page.text.includes('Pickleball')) {
    throw new Error(`${path} -> ${page.status} ${page.type}`)
  }
}

const revisionBody = await get('/api/revision')
const revision = JSON.parse(revisionBody.text).revision
const stateBody = await get(`/api/state?v=${revision}`)
const state = JSON.parse(stateBody.text)
if (state.data.tournaments.length !== 3) throw new Error('tournament count')
if (!state.data.players.some((player) => player.name === 'Minh Khoa')) throw new Error('missing unicode name')

const denied = await fetch(base + '/api/admin/commit', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: '{}',
  signal: AbortSignal.timeout(8000),
})
if (denied.status !== 401) throw new Error(`guest commit ${denied.status}`)

const login = await fetch(base + '/api/admin/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'wrong' }),
  signal: AbortSignal.timeout(8000),
})
if (login.status !== 401) throw new Error(`bad password ${login.status}`)

const session = await fetch(base + '/api/admin/login', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'demo123' }),
  signal: AbortSignal.timeout(8000),
})
const cookie = session.headers.getSetCookie?.() ?? []
const rawCookie = session.headers.get('set-cookie') ?? ''
const token = (cookie[0] ?? rawCookie).split(';')[0]
if (!session.ok || !token.startsWith('pb_session=')) throw new Error('login failed')

const match = state.data.matches.find((item) => item.id === 'hn-th-dd')
const original = match.sets[0]
const next = {
  ...state.data,
  matches: state.data.matches.map((item) =>
    item.id === 'hn-th-dd' ? { ...item, sets: [{ a: 11, b: 7 }], forfeit: undefined } : item,
  ),
}
const saved = await fetch(base + '/api/admin/commit', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: token },
  body: JSON.stringify({ expectedRevision: state.revision, action: 'updateMatch', entityId: 'hn-th-dd', data: next }),
  signal: AbortSignal.timeout(8000),
})
const savedBody = await saved.json()
if (!saved.ok) throw new Error(`save ${saved.status} ${JSON.stringify(savedBody)}`)
const updated = savedBody.data.matches.find((item) => item.id === 'hn-th-dd')
if (updated.sets[0].a !== 11 || updated.status !== 'finished') throw new Error(`score status ${updated.status}`)

const stale = await fetch(base + '/api/admin/commit', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: token },
  body: JSON.stringify({ expectedRevision: state.revision, action: 'updateMatch', entityId: 'hn-th-dd', data: state.data }),
  signal: AbortSignal.timeout(8000),
})
if (stale.status !== 409) throw new Error(`conflict ${stale.status}`)

const restored = await fetch(base + '/api/admin/commit', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: token },
  body: JSON.stringify({
    expectedRevision: savedBody.revision,
    action: 'updateMatch',
    entityId: 'hn-th-dd',
    data: {
      ...savedBody.data,
      matches: savedBody.data.matches.map((item) =>
        item.id === 'hn-th-dd' ? { ...item, sets: [original], status: 'live' } : item,
      ),
    },
  }),
  signal: AbortSignal.timeout(8000),
})
if (!restored.ok) throw new Error(`restore ${restored.status}`)

await fetch(base + '/api/admin/logout', { method: 'POST', headers: { cookie: token }, signal: AbortSignal.timeout(8000) })
const afterLogout = await fetch(base + '/api/admin/commit', {
  method: 'POST',
  headers: { 'content-type': 'application/json', cookie: token },
  body: '{}',
  signal: AbortSignal.timeout(8000),
})
if (afterLogout.status !== 401) throw new Error(`logout still writes ${afterLogout.status}`)

const audit = await fetch(base + '/api/admin/audit', { headers: { cookie: token }, signal: AbortSignal.timeout(8000) })
if (audit.status !== 401) throw new Error(`audit after logout ${audit.status}`)

console.log('smoke-ok')
