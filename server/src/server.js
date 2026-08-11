try { require('dotenv').config() } catch (_) { }
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const app = express()
app.set('trust proxy', true)
const PORT = process.env.PORT || 3001
const HOST = process.env.HOST || '0.0.0.0'

app.get('/download', (req, res) => {
  const zip = path.join(__dirname, '..', '..', 'lite', 'dist', 'sales-workbench.zip')
  if (fs.existsSync(zip)) {
    const stat = fs.statSync(zip)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Content-Disposition', 'attachment; filename="sales-workbench.zip"')
    res.setHeader('Content-Type', 'application/zip')
    res.sendFile(zip)
  } else { res.status(404).send('not found') }
})
app.get('/healthz', (req, res) => res.status(200).type('text/plain').send('ok'))
app.get('/health',  (req, res) => res.status(200).type('text/plain').send('ok'))
app.head(['/', '/healthz', '/health'], (req, res) => { res.status(200).set('Content-Length', '0').end() })
app.use(cors({ origin: true, credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH','HEAD'],
  allowedHeaders: ['Content-Type','Authorization','Accept'],
  maxAge: 86400 }))
app.options('*', (req, res) => res.status(204).end())
app.use(express.json({ limit: '10mb' }))
app.use((err, req, res, next) => { if (err?.type==='entity.parse.failed') {req.body={};return next()} next(err) })
app.use(express.urlencoded({ extended: true, limit: '10mb' }))
const routes = [
  ['/api/users','./routes/userRoutes'],['/api/projects','./routes/projectRoutes'],
  ['/api/contracts','./routes/contractRoutes'],['/api/schedules','./routes/scheduleRoutes'],
  ['/api/customers','./routes/customerRoutes'],['/api/sync','./routes/syncRoutes'],
  ['/api/ai','./routes/aiRoutes'],['/api/data','./routes/dataRoutes'],
]
routes.forEach(([p,m]) => { try{app.use(p,require(m))}catch(e){console.warn(e.message)} })
const dirs = [path.join(__dirname,'../dist'),path.join(__dirname,'../../lite/dist'),path.join(__dirname,'../../dist')]
let sd=null; for(const p of dirs){try{if(fs.existsSync(p+'/index.html')){sd=p;break}}catch{}}
if(sd){ app.use(express.static(sd)); app.get('*',(req,res)=>res.sendFile(sd+'/index.html')) }
app.use((req,res)=>{ if(req.url.startsWith('/api/')) res.status(404).json({msg:'not found'}); else if(sd) res.sendFile(sd+'/index.html'); else res.status(404).send('404') })
const srv = app.listen(PORT, HOST, () => {
  console.log(`server on ${PORT}`)
  setTimeout(async()=>{ try{ await require('./config/db')(); const U=require('./models/User'); if(!(await U.findOne({username:'admin'}))) await U.create({username:'admin',password:'admin123',name:'admin'}); }catch(e){} },2000)
})
srv.on('error',e=>console.error(e))
