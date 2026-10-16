const AUTH_KEY = 'pickleball-results-admin-session'
const AUTH_EVENT = 'pickleball-auth'

function notifyAuth() {
  window.dispatchEvent(new Event(AUTH_EVENT))
}

export function watchOrganizerAuth(onChange: () => void) {
  window.addEventListener(AUTH_EVENT, onChange)
  return () => window.removeEventListener(AUTH_EVENT, onChange)
}

export const DEMO_ACCOUNT = {
  username: 'admin',
  password: 'demo123',
}

export function organizerSignedIn() {
  return sessionStorage.getItem(AUTH_KEY) === 'ok'
}

export function signIn(username: string, password: string) {
  const accepted = username.trim() === DEMO_ACCOUNT.username && password === DEMO_ACCOUNT.password
  if (accepted) {
    sessionStorage.setItem(AUTH_KEY, 'ok')
    notifyAuth()
  }
  return accepted
}

export function signOut() {
  sessionStorage.removeItem(AUTH_KEY)
  notifyAuth()
}
