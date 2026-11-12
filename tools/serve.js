#!/usr/bin/env node
'use strict'
/**
 * Zero-dependency static server for the docs folder.
 *   node documentation/tools/serve.js [port]
 */
const http = require('http')
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const PORT = Number(process.argv[2] || 4178)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8'
}

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0])
  const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '')
  const file = path.join(ROOT, rel)

  if (!file.startsWith(ROOT)) {
    res.writeHead(403, { 'content-type': 'text/plain' })
    return res.end('forbidden')
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('404 ' + rel)
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-cache'
    })
    res.end(data)
  })
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`documentation server listening on http://127.0.0.1:${PORT} (pid ${process.pid})`)
  console.log(`root: ${ROOT}`)
})
