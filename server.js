import express from 'express'
import path from 'path'

const app = express()
const __dirname = path.resolve()

const PORT = process.env.PORT || 8007

app.use(express.static(path.join(__dirname, 'dist')))

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => console.log(`App running on port ${PORT}`))

//  while deploying enter the port name
// docker run -d \ --name frontend \ -p 8939:8939 \ -e PORT=8939 \ frontend-image