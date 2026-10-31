import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pkgPath = path.resolve(__dirname, '..', 'package.json')

try {
  const pkgData = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const parts = (pkgData.version || '0.0.0').split('.').map(num => parseInt(num, 10) || 0)
  while (parts.length < 3) parts.push(0)
  
  // Auto-increment patch version with semver rollover at 100
  parts[2] += 1
  if (parts[2] >= 100) {
    parts[1] += 1
    parts[2] = 0
  }
  if (parts[1] >= 100) {
    parts[0] += 1
    parts[1] = 0
  }
  const newVersion = parts.join('.')
  pkgData.version = newVersion

  fs.writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2) + '\n', 'utf8')
  console.log(`[Version Auto-Increment] Bumped version to ${newVersion}`)
} catch (err) {
  console.error('[Version Auto-Increment] Failed to bump version:', err)
  process.exit(1)
}
