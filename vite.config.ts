import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

function agentDebugLogPlugin(): Plugin {
  const logFile = path.resolve(rootDir, 'debug-3f15d6.log')
  return {
    name: 'agent-debug-log',
    configureServer(server) {
      server.middlewares.use('/__agent_debug_log', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.statusCode = 204
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.end()
          return
        }
        if (req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)))
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8')
            fs.appendFileSync(logFile, body.trim() + '\n', 'utf8')
            res.statusCode = 204
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.end()
          } catch (err) {
            res.statusCode = 500
            res.end(String(err))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [agentDebugLogPlugin()],
})
