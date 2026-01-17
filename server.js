// server.js
import express from 'express'
import path from 'path'

const app = express()
const __dirname = path.resolve()

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(8080, () => console.log('App running on port 8080'))
