/**
 * Copies the HybridView config that nitrogen generates into src/specs/, so that
 * src/MunimMetalkitView.tsx can import it with a path that also resolves from
 * the compiled output (bob writes lib/commonjs/ and lib/module/, one level
 * deeper than src/, so `../nitrogen/...` would not resolve there; bob copies
 * JSON files from src/ as they are).
 *
 * Run after `nitrogen` (see the `codegen` script).
 */
const path = require('node:path')
const fs = require('node:fs')

const name = 'MunimMetalkitViewConfig.json'
const from = path.join(__dirname, '..', 'nitrogen/generated/shared/json', name)
const to = path.join(__dirname, '..', 'src/specs', name)

fs.copyFileSync(from, to)
console.log(`copy-view-config: ${path.relative(process.cwd(), to)}`)
