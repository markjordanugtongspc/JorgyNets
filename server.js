import http from 'node:http'
import sql from './db.js'

const PORT = process.env.PORT || 3001

// Setup schema and demo table if not existing
async function initDb() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
    console.log('[Database] System logs table ready.')
  } catch (err) {
    console.error('[Database] Init warning:', err.message)
  }
}

initDb()

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)

  if (url.pathname === '/api/health' && req.method === 'GET') {
    try {
      const [dbInfo] = await sql`SELECT NOW() as server_time, current_database() as database, version() as version`
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({
        status: 'online',
        database: dbInfo.database,
        serverTime: dbInfo.server_time,
        postgresVersion: dbInfo.version
      }))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'error', message: err.message }))
    }
    return
  }

  if (url.pathname === '/api/logs' && req.method === 'GET') {
    try {
      const logs = await sql`SELECT * FROM system_logs ORDER BY created_at DESC LIMIT 10`
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true, data: logs }))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: false, message: err.message }))
    }
    return
  }

  if (url.pathname === '/api/logs' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}')
        const action = payload.action || 'User Interaction'
        const status = payload.status || 'Success'

        const [newLog] = await sql`
          INSERT INTO system_logs (action, status)
          VALUES (${action}, ${status})
          RETURNING *;
        `
        res.writeHead(201, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: true, data: newLog }))
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ success: false, message: err.message }))
      }
    })
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Endpoint not found' }))
})

server.listen(PORT, () => {
  console.log(`[API Server] Running at http://localhost:${PORT}`)
})
