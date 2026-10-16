import { pbkdf2Sync, randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { stdin, stdout } from 'node:process'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const iterations = 10000
const sqlFile = '.admin-bootstrap.sql'

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function option(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return ''
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) fail(`Thiếu giá trị sau ${name}`)
  return value
}

const known = new Set(['--apply-local', '--database', '--persist-to', '--config'])
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index]
  if (!arg.startsWith('--')) fail('Không truyền mật khẩu qua tham số lệnh.')
  if (!known.has(arg)) fail(`Tham số không dùng: ${arg}`)
  if (arg !== '--apply-local') index += 1
}

const database = option('--database') || 'pickleball-thuyloi-db'
const persistTo = option('--persist-to')
const config = option('--config')
const applyLocal = process.argv.includes('--apply-local')

let pending = ''
const waiters = []

function takeLine() {
  const end = pending.indexOf('\n')
  if (end === -1) return null
  const line = pending.slice(0, end).replace(/\r$/, '')
  pending = pending.slice(end + 1)
  return line
}

function pump(chunk) {
  pending += chunk
  while (waiters.length > 0) {
    const line = takeLine()
    if (line == null) return
    waiters.shift()(line)
  }
}

if (!stdin.isTTY) {
  stdin.setEncoding('utf8')
  stdin.on('data', pump)
  stdin.resume()
}

function readLine() {
  const ready = takeLine()
  if (ready != null) return Promise.resolve(ready)
  return new Promise((resolve) => {
    waiters.push(resolve)
  })
}

function askVisible(label) {
  if (!stdin.isTTY) return readLine()
  return new Promise((resolve) => {
    stdout.write(label)
    let line = ''
    const onData = (chunk) => {
      line += chunk
      const end = line.indexOf('\n')
      if (end === -1) return
      stdin.off('data', onData)
      stdin.pause()
      resolve(line.slice(0, end).replace(/\r$/, ''))
    }
    stdin.setEncoding('utf8')
    stdin.resume()
    stdin.on('data', onData)
  })
}

function askHidden(label) {
  if (!stdin.isTTY) return readLine()
  return new Promise((resolve) => {
    stdout.write(label)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''
    const onData = (char) => {
      if (char === '\r' || char === '\n' || char === '\u0004') {
        stdin.setRawMode(false)
        stdin.pause()
        stdin.off('data', onData)
        stdout.write('\n')
        resolve(value)
        return
      }
      if (char === '\u0003') process.exit(1)
      if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1)
        return
      }
      if (char < ' ') return
      value += char
    }
    stdin.on('data', onData)
  })
}

const name = (await askVisible('Tên đăng nhập: ')).trim()
const password = await askHidden('Mật khẩu: ')
const again = await askHidden('Nhập lại mật khẩu: ')

if (!/^[A-Za-z0-9_-]{1,40}$/.test(name)) fail('Tên đăng nhập chỉ gồm chữ, số, gạch ngang hoặc gạch dưới, tối đa 40 ký tự.')
if (password !== again) fail('Hai lần nhập mật khẩu không giống nhau.')
if (password.length < 12 || password.length > 80) fail('Mật khẩu cần từ 12 đến 80 ký tự.')
if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) fail('Mật khẩu cần có cả chữ và số.')
if (password.toLowerCase().includes('demo') || password.toLowerCase() === 'password') fail('Mật khẩu này quá dễ đoán.')

const salt = randomBytes(16)
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256')
const id = `admin-${randomBytes(8).toString('hex')}`
const createdAt = new Date().toISOString()
const sql = `INSERT INTO admins (id, username, password_salt, password_hash, iterations, created_at) VALUES ('${id}', '${name}', '${salt.toString('hex')}', '${hash.toString('hex')}', ${iterations}, '${createdAt}');\n`
writeFileSync(sqlFile, sql, { encoding: 'utf8', flag: 'w' })

if (!applyLocal) {
  process.stdout.write(
    'Đã ghi .admin-bootstrap.sql. Git bỏ qua file này.\nKhi đã xác nhận đưa site lên Internet, chạy:\nnpx wrangler d1 execute pickleball-thuyloi-db --remote --file .admin-bootstrap.sql\nRồi xóa .admin-bootstrap.sql.\n',
  )
  process.exit(0)
}

const args = []
if (config) args.push('--config', config)
args.push('d1', 'execute', database, '--local', '--file', sqlFile)
if (persistTo) args.push('--persist-to', persistTo)
const wrangler = join(dirname(fileURLToPath(import.meta.url)), '../node_modules/wrangler/bin/wrangler.js')
const result = spawnSync(process.execPath, [wrangler, ...args], { stdio: 'inherit' })
if (result.status !== 0) fail('Chưa ghi được tài khoản vào database local. File .admin-bootstrap.sql vẫn còn để thử lại.')
process.stdout.write('Đã tạo tài khoản trên database local. Xóa .admin-bootstrap.sql sau khi không còn cần.\n')
