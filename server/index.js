import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import shiftLogsRouter from './routes/shiftLogs.js'
import caseFlagsRouter from './routes/caseFlags.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/shift-logs', shiftLogsRouter)
app.use('/api/case-flags', caseFlagsRouter)

// Serve built React app in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`ME Scrutiny Log server running on http://localhost:${PORT}`)
})
