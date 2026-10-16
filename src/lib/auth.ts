const AUTH_KEY = 'pickleball-results-admin-session'
const AUTH_EVENT = 'pickleball-auth'

let usingServer = false
let serverSignedIn = false

function notifyAuth() {
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function watchOrganizerAuth(onChange: () => void) {
  window.addEventListener(AUTH_EVENT, onChange)
  return () => window.removeEventListener(AUTH_EVENT, onChange)
}

export function authUsesServer() {
  return usingServer
}

export function setAuthMode(server: boolean, signedIn: boolean) {
  usingServer = server
  serverSignedIn = signedIn
  notifyAuth()
}

export const DEMO_ACCOUNT = {
  username: 'admin',
  password: 'demo123',
}

export function organizerSignedIn() {
  if (usingServer) return serverSignedIn
  return sessionStorage.getItem(AUTH_KEY) === 'ok'
}

export async function signIn(username: string, password: string) {
  if (usingServer) {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    })
    serverSignedIn = response.ok
    if (response.ok) notifyAuth()
    return response.ok
  }
  const accepted = username.trim() === DEMO_ACCOUNT.username && password === DEMO_ACCOUNT.password
  if (accepted) {
    sessionStorage.setItem(AUTH_KEY, 'ok')
    notifyAuth()
  }
  return accepted
}

export async function signOut() {
  if (usingServer) {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' })
    serverSignedIn = false
  }
  sessionStorage.removeItem(AUTH_KEY)
  notifyAuth()
}
