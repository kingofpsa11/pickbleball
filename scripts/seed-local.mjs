import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

if (process.argv.includes('--remote')) fail('Không nhập dữ liệu mẫu vào database production.')

const persistIndex = process.argv.indexOf('--persist-to')
const persistTo = persistIndex === -1 ? '' : process.argv[persistIndex + 1]
if (persistIndex !== -1 && (!persistTo || persistTo.startsWith('--'))) fail('Thiếu thư mục sau --persist-to')

const wrangler = join(dirname(fileURLToPath(import.meta.url)), '../node_modules/wrangler/bin/wrangler.js')

function wranglerRun(extra) {
  const args = [wrangler, 'd1', 'execute', 'pickleball-thuyloi-db', '--local', ...extra]
  if (persistTo) args.push('--persist-to', persistTo)
  return spawnSync(process.execPath, args, { encoding: 'utf8' })
}

const count = wranglerRun(['--json', '--command', 'SELECT COUNT(*) AS n FROM tournaments'])
const combined = `${count.stdout}\n${count.stderr}`
if (count.status !== 0) {
  if (combined.includes('no such table')) fail('Database local chưa có bảng. Chạy npm run cf:migrate trước.')
  process.stderr.write(combined)
  process.exit(count.status ?? 1)
}
const rows = JSON.parse(count.stdout)
const existing = rows?.[0]?.results?.[0]?.n ?? 0
if (existing > 0) fail(`Database local đang có ${existing} giải. Không nhập dữ liệu mẫu đè lên.`)

const seeded = wranglerRun(['--file', 'scripts/local-seed.sql'])
if (seeded.stdout) process.stdout.write(seeded.stdout)
if (seeded.stderr) process.stderr.write(seeded.stderr)
if (seeded.status !== 0) process.exit(seeded.status ?? 1)
process.stdout.write('Đã nhập dữ liệu mẫu vào database local. Database production không bị đổi.\n')
