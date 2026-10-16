export async function spa(request: Request) {
  const url = new URL(request.url)
  url.pathname = '/index.html'
  url.search = ''
  return fetch(url)
}
