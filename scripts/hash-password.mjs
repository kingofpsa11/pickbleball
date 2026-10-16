import { pbkdf2Sync, randomBytes } from 'node:crypto'

const password = process.argv[2] ?? 'demo123'
const iterations = 10000
const salt = randomBytes(16)
const started = performance.now()
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256')
const elapsed = Math.round(performance.now() - started)

process.stdout.write(
  `${JSON.stringify({
    iterations,
    elapsedMs: elapsed,
    salt: salt.toString('hex'),
    hash: hash.toString('hex'),
  })}\n`,
)
