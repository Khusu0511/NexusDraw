const express = require('express')
const { createServer } = require('http')
const { Server } = require('socket.io')
const path = require('path')

const app  = express()
const http = createServer(app)
const io   = new Server(http, { cors: { origin: '*' } })

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; " +
    "connect-src 'self' ws: wss: blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src blob: 'self';"
  )
  next()
})

app.use(express.static(path.join(__dirname)))
app.get('/',       (_, res) => res.sendFile(path.join(__dirname, 'index.html')))
app.get('/health', (_, res) => res.json({ ok: true, uptime: process.uptime() }))

const PORT = process.env.PORT || 3001

const CNN_CATS = [
  'airplane','apple','bicycle','bird','book',
  'butterfly','car','cat','circle','clock',
  'cloud','dog','fish','flower','guitar',
  'house','moon','pizza','shoe','square',
  'star','sun','tree','triangle','umbrella'
]

const WORDS = {
  easy:   ['cat','dog','sun','house','fish','bird','car','book','tree','moon','star','hat',
           'cup','ball','cake','door','flower','heart','plane','boat','frog','duck','clock',
           'chair','rain','snow','fire','leaf','key','bag'],
  medium: ['bicycle','guitar','castle','rainbow','volcano','penguin','lighthouse','tornado',
           'sandwich','umbrella','telescope','waterfall','butterfly','elephant','pineapple',
           'astronaut','treasure','snowman','giraffe','fireworks','skateboard','submarine',
           'helicopter','kangaroo','jellyfish'],
  hard:   ['photosynthesis','democracy','constellation','labyrinth','metamorphosis',
           'procrastination','biodiversity','renaissance','electromagnetic','claustrophobia']
}

function pickWords(difficulty, aiMode, n = 3) {
  if (aiMode) return [...CNN_CATS].sort(() => Math.random() - .5).slice(0, n)
  const pool = difficulty === 'easy'  ? WORDS.easy
             : difficulty === 'hard'  ? WORDS.hard
             : [...WORDS.easy, ...WORDS.medium, ...WORDS.hard]
  return [...pool].sort(() => Math.random() - .5).slice(0, n)
}

function genStrokes(word) {
  const cx = 0.5, cy = 0.5, r = 0.22, K = '#111111', sw = 0.010
  const circ = (ox, oy, rad, steps = 18) => {
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * Math.PI * 2
      pts.push({ x: ox + Math.cos(a) * rad, y: oy + Math.sin(a) * rad })
    }
    return pts
  }
  const arc = (ox, oy, rad, s, e, steps = 12) => {
    const pts = []
    for (let i = 0; i <= steps; i++) {
      const a = (s + (e - s) * i / steps) * Math.PI / 180
      pts.push({ x: ox + Math.cos(a) * rad, y: oy + Math.sin(a) * rad })
    }
    return pts
  }
  switch (word) {
    case 'circle':   return [{ c:K, s:sw, p:circ(cx,cy,r) }]
    case 'square':   return [{ c:K, s:sw, p:[{x:cx-r,y:cy-r},{x:cx+r,y:cy-r},{x:cx+r,y:cy+r},{x:cx-r,y:cy+r},{x:cx-r,y:cy-r}] }]
    case 'triangle': return [{ c:K, s:sw, p:[{x:cx,y:cy-r},{x:cx+r*.866,y:cy+r*.5},{x:cx-r*.866,y:cy+r*.5},{x:cx,y:cy-r}] }]
    case 'star': {
      const pts = []
      for (let i = 0; i < 11; i++) {
        const a = i/5*Math.PI-Math.PI/2, rd = i%2===0?r:r*.42
        pts.push({ x:cx+Math.cos(a)*rd, y:cy+Math.sin(a)*rd })
      }
      return [{ c:K, s:sw*.85, p:pts }]
    }
    case 'sun': {
      const rays = []
      for (let i = 0; i < 8; i++) {
        const a = i*Math.PI/4
        rays.push({ c:'#d97706', s:sw*.8, p:[{x:cx+Math.cos(a)*r*.6,y:cy+Math.sin(a)*r*.6},{x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r}] })
      }
      return [{ c:'#d97706', s:sw, p:circ(cx,cy,r*.44) }, ...rays]
    }
    case 'moon': {
      const outer = arc(cx,cy,r,-60,240,18)
      const inner = arc(cx+r*.38,cy,r*.76,240,300,14)
      return [{ c:'#d97706', s:sw, p:[...outer,...inner,outer[0]] }]
    }
    case 'cloud': return [
      { c:K, s:sw, p:circ(cx-r*.38,cy+r*.05,r*.36) },
      { c:K, s:sw, p:circ(cx,cy-r*.1,r*.46) },
      { c:K, s:sw, p:circ(cx+r*.38,cy+r*.05,r*.36) }
    ]
    case 'tree': return [
      { c:'#166534', s:sw, p:[{x:cx,y:cy-r},{x:cx+r*.72,y:cy+r*.34},{x:cx-r*.72,y:cy+r*.34},{x:cx,y:cy-r}] },
      { c:'#a16207', s:sw, p:[{x:cx-r*.14,y:cy+r*.34},{x:cx-r*.14,y:cy+r},{x:cx+r*.14,y:cy+r},{x:cx+r*.14,y:cy+r*.34}] }
    ]
    case 'flower': {
      const petals = []
      for (let i = 0; i < 6; i++) {
        const a = i*Math.PI/3
        petals.push({ c:'#ec4899', s:sw*.9, p:circ(cx+Math.cos(a)*r*.64,cy+Math.sin(a)*r*.64,r*.28) })
      }
      return [...petals, { c:'#eab308', s:sw, p:circ(cx,cy,r*.24) }, { c:'#166534', s:sw, p:[{x:cx,y:cy+r*.24},{x:cx,y:cy+r*1.05}] }]
    }
    case 'fish': {
      const body = []
      for (let a = 0; a <= Math.PI*2; a += .28) body.push({ x:cx+Math.cos(a)*r, y:cy+Math.sin(a)*r*.58 })
      return [{ c:'#2563eb', s:sw, p:body }, { c:'#2563eb', s:sw, p:[{x:cx+r*.84,y:cy-r*.38},{x:cx+r*1.46,y:cy},{x:cx+r*.84,y:cy+r*.38},{x:cx+r*.84,y:cy-r*.38}] }]
    }
    case 'bird': return [{ c:K, s:sw*1.2, p:[{x:cx-r,y:cy},{x:cx-r*.5,y:cy-r*.45},{x:cx,y:cy-r*.1},{x:cx+r*.5,y:cy-r*.45},{x:cx+r,y:cy}] }]
    case 'butterfly': return [
      { c:'#7c3aed', s:sw, p:[{x:cx,y:cy},{x:cx-r*.3,y:cy-r*.8},{x:cx-r*.9,y:cy-r*.5},{x:cx-r*.8,y:cy+r*.1},{x:cx,y:cy}] },
      { c:'#7c3aed', s:sw, p:[{x:cx,y:cy},{x:cx-r*.6,y:cy+r*.4},{x:cx-r*.5,y:cy+r*.8},{x:cx-r*.1,y:cy+r*.4},{x:cx,y:cy}] },
      { c:'#7c3aed', s:sw, p:[{x:cx,y:cy},{x:cx+r*.3,y:cy-r*.8},{x:cx+r*.9,y:cy-r*.5},{x:cx+r*.8,y:cy+r*.1},{x:cx,y:cy}] },
      { c:'#7c3aed', s:sw, p:[{x:cx,y:cy},{x:cx+r*.6,y:cy+r*.4},{x:cx+r*.5,y:cy+r*.8},{x:cx+r*.1,y:cy+r*.4},{x:cx,y:cy}] },
      { c:K, s:sw*.8, p:[{x:cx,y:cy-r*.4},{x:cx,y:cy+r*.55}] }
    ]
    case 'cat': return [
      { c:K, s:sw, p:circ(cx,cy+r*.08,r*.72) },
      { c:K, s:sw, p:[{x:cx-r*.52,y:cy-r*.52},{x:cx-r*.68,y:cy-r*.9},{x:cx-r*.22,y:cy-r*.62},{x:cx-r*.52,y:cy-r*.52}] },
      { c:K, s:sw, p:[{x:cx+r*.52,y:cy-r*.52},{x:cx+r*.68,y:cy-r*.9},{x:cx+r*.22,y:cy-r*.62},{x:cx+r*.52,y:cy-r*.52}] },
      { c:K, s:sw*.55, p:[{x:cx-r*.72,y:cy+r*.12},{x:cx-r*.12,y:cy+r*.08}] },
      { c:K, s:sw*.55, p:[{x:cx+r*.72,y:cy+r*.12},{x:cx+r*.12,y:cy+r*.08}] }
    ]
    case 'dog': return [
      { c:K, s:sw, p:[{x:cx-r*.75,y:cy+r*.1},{x:cx-r*.75,y:cy+r*.7},{x:cx+r*.75,y:cy+r*.7},{x:cx+r*.75,y:cy+r*.1}] },
      { c:K, s:sw, p:circ(cx+r*.45,cy-r*.26,r*.5) },
      { c:K, s:sw, p:[{x:cx+r*.1,y:cy-r*.5},{x:cx+r*.02,y:cy+r*.08},{x:cx+r*.3,y:cy+r*.04},{x:cx+r*.1,y:cy-r*.5}] },
      { c:K, s:sw, p:[{x:cx-r*.5,y:cy+r*.7},{x:cx-r*.5,y:cy+r*1.05}] },
      { c:K, s:sw, p:[{x:cx-r*.18,y:cy+r*.7},{x:cx-r*.18,y:cy+r*1.05}] },
      { c:K, s:sw, p:[{x:cx+r*.18,y:cy+r*.7},{x:cx+r*.18,y:cy+r*1.05}] },
      { c:K, s:sw, p:[{x:cx+r*.5,y:cy+r*.7},{x:cx+r*.5,y:cy+r*1.05}] }
    ]
    case 'airplane': return [
      { c:K, s:sw*1.2, p:[{x:cx-r*.88,y:cy},{x:cx+r,y:cy}] },
      { c:K, s:sw, p:[{x:cx-r*.1,y:cy-r*.68},{x:cx+r*.08,y:cy},{x:cx-r*.1,y:cy+r*.68}] },
      { c:K, s:sw, p:[{x:cx-r*.72,y:cy-r*.32},{x:cx-r*.88,y:cy},{x:cx-r*.72,y:cy+r*.32}] }
    ]
    case 'bicycle': return [
      { c:K, s:sw, p:circ(cx-r*.72,cy+r*.3,r*.52) },
      { c:K, s:sw, p:circ(cx+r*.72,cy+r*.3,r*.52) },
      { c:K, s:sw, p:[{x:cx-r*.18,y:cy-r*.22},{x:cx-r*.18,y:cy+r*.3},{x:cx+r*.72,y:cy+r*.3}] },
      { c:K, s:sw, p:[{x:cx-r*.72,y:cy+r*.3},{x:cx-r*.18,y:cy+r*.3},{x:cx+r*.12,y:cy-r*.32}] },
      { c:K, s:sw, p:[{x:cx+r*.06,y:cy-r*.38},{x:cx+r*.28,y:cy-r*.38},{x:cx+r*.22,y:cy-r*.22}] }
    ]
    case 'car': return [
      { c:K, s:sw, p:[{x:cx-r*.88,y:cy+r*.18},{x:cx-r*.88,y:cy+r*.5},{x:cx+r*.88,y:cy+r*.5},{x:cx+r*.88,y:cy+r*.18}] },
      { c:K, s:sw, p:[{x:cx-r*.52,y:cy+r*.18},{x:cx-r*.38,y:cy-r*.35},{x:cx+r*.38,y:cy-r*.35},{x:cx+r*.52,y:cy+r*.18}] },
      { c:K, s:sw, p:circ(cx-r*.55,cy+r*.55,r*.28) },
      { c:K, s:sw, p:circ(cx+r*.55,cy+r*.55,r*.28) }
    ]
    case 'house': return [
      { c:K, s:sw, p:[{x:cx-r*1.1,y:cy+r*.08},{x:cx,y:cy-r*.9},{x:cx+r*1.1,y:cy+r*.08}] },
      { c:K, s:sw, p:[{x:cx-r,y:cy+r*.08},{x:cx-r,y:cy+r},{x:cx+r,y:cy+r},{x:cx+r,y:cy+r*.08}] }
    ]
    case 'book': return [
      { c:'#2563eb', s:sw, p:[{x:cx-r*.8,y:cy-r},{x:cx+r*.8,y:cy-r},{x:cx+r*.8,y:cy+r},{x:cx-r*.8,y:cy+r},{x:cx-r*.8,y:cy-r}] },
      { c:K, s:sw, p:[{x:cx-r*.55,y:cy-r},{x:cx-r*.55,y:cy+r}] },
      { c:K, s:sw*.6, p:[{x:cx-r*.3,y:cy-r*.5},{x:cx+r*.6,y:cy-r*.5}] },
      { c:K, s:sw*.6, p:[{x:cx-r*.3,y:cy},{x:cx+r*.6,y:cy}] },
      { c:K, s:sw*.6, p:[{x:cx-r*.3,y:cy+r*.5},{x:cx+r*.6,y:cy+r*.5}] }
    ]
    case 'clock': return [
      { c:K, s:sw, p:circ(cx,cy,r) },
      { c:K, s:sw*1.2, p:[{x:cx,y:cy},{x:cx-r*.5,y:cy}] },
      { c:K, s:sw*1.2, p:[{x:cx,y:cy},{x:cx,y:cy-r*.65}] }
    ]
    case 'guitar': return [
      { c:K, s:sw, p:circ(cx,cy-r*.32,r*.44) },
      { c:K, s:sw, p:circ(cx,cy+r*.42,r*.58) },
      { c:K, s:sw, p:[{x:cx-r*.32,y:cy-r*.12},{x:cx-r*.38,y:cy+r*.1},{x:cx+r*.38,y:cy+r*.1},{x:cx+r*.32,y:cy-r*.12}] },
      { c:K, s:sw, p:[{x:cx-r*.12,y:cy-r*.72},{x:cx-r*.12,y:cy-r*1.05},{x:cx+r*.12,y:cy-r*1.05},{x:cx+r*.12,y:cy-r*.72}] },
      { c:K, s:sw*.8, p:circ(cx,cy+r*.38,r*.2) }
    ]
    case 'shoe': return [
      { c:K, s:sw, p:arc(cx+r*.65,cy+r*.28,r*.3,-45,90,8) },
      { c:K, s:sw, p:[{x:cx-r*.72,y:cy},{x:cx-r*.55,y:cy-r*.38},{x:cx+r*.08,y:cy-r*.42},{x:cx+r*.38,y:cy-r*.1},{x:cx+r*.88,y:cy+r*.28}] },
      { c:K, s:sw, p:[{x:cx-r*.82,y:cy+r*.55},{x:cx+r*.88,y:cy+r*.55}] },
      { c:K, s:sw, p:[{x:cx-r*.82,y:cy+r*.55},{x:cx-r*.82,y:cy}] }
    ]
    case 'umbrella': {
      const ribs = [0,36,72,108,144,180].map(deg => {
        const a = deg*Math.PI/180
        return { c:K, s:sw*.6, p:[{x:cx,y:cy+r*.05},{x:cx+Math.cos(a)*r,y:cy+r*.05-Math.sin(a)*r}] }
      })
      return [
        { c:'#2563eb', s:sw, p:arc(cx,cy+r*.05,r,180,0,16) }, ...ribs,
        { c:K, s:sw, p:[{x:cx,y:cy+r*.05},{x:cx,y:cy+r*.88}] },
        { c:K, s:sw, p:[{x:cx,y:cy+r*.88},{x:cx-r*.28,y:cy+r*.88},{x:cx-r*.3,y:cy+r*.62}] }
      ]
    }
    case 'apple': return [
      { c:'#dc2626', s:sw, p:circ(cx,cy+r*.08,r*.88) },
      { c:'#a16207', s:sw*.8, p:[{x:cx+r*.08,y:cy-r*.82},{x:cx+r*.12,y:cy-r*1.08}] },
      { c:'#166534', s:sw*.7, p:[{x:cx+r*.12,y:cy-r*1.06},{x:cx+r*.42,y:cy-r*1.16},{x:cx+r*.28,y:cy-r*.9}] }
    ]
    case 'pizza': return [
      { c:K, s:sw, p:[{x:cx,y:cy-r*.88},{x:cx+r*.78,y:cy+r*.72},{x:cx-r*.78,y:cy+r*.72},{x:cx,y:cy-r*.88}] },
      { c:'#a16207', s:sw*1.5, p:arc(cx,cy+r*.5,r*.95,220,320,10) },
      { c:'#dc2626', s:sw*2.8, p:[{x:cx,y:cy},{x:cx+.001,y:cy}] }
    ]
    default: return [{ c:K, s:sw, p:circ(cx,cy,r) }]
  }
}

const rooms = new Map()
const genCode = () => { const ch='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<6;i++) s+=ch[Math.floor(Math.random()*ch.length)]; return s }
const getRoom   = c => rooms.get(c)
const getPlayer = (r,id) => r?.players.find(p=>p.id===id)
const getBot    = (r,id) => r?.bots.find(b=>b.id===id)
const isBot     = (r,id) => !!getBot(r,id)
const ini       = n => (n||'?').trim().slice(0,2).toUpperCase()
const clean     = s => String(s||'Player').trim().replace(/[<>"']/g,'').slice(0,20)||'Player'
const dname     = (r,id) => getPlayer(r,id)?.name||getBot(r,id)?.name||'?'
const bcast     = (r,ev,d) => io.to(r.code).emit(ev,d)

function sync(room) {
  bcast(room,'room-update',{
    code:room.code, settings:room.settings, host:room.host,
    players:room.players,
    bots:room.bots.map(b=>({id:b.id,name:b.name,avatar:b.avatar,emoji:b.emoji,score:b.score||0,hasGuessed:!!b.hasGuessed})),
    game:{phase:room.game.phase,round:room.game.round,totalRounds:room.settings.rounds,
      drawerId:room.game.drawerId,timeLeft:room.game.timeLeft,wordLen:room.game.word?.length||0,
      aiMode:room.settings.aiMode,drawerIsBot:isBot(room,room.game.drawerId)}
  })
}

function parseSettings(s) {
  return {
    rounds:     Math.min(10,Math.max(1,+s.rounds||3)),
    drawTime:   [60,80,100,120].includes(+s.drawTime)?+s.drawTime:80,
    difficulty: ['easy','mixed','hard'].includes(s.difficulty)?s.difficulty:'mixed',
    maxPlayers: Math.min(16,Math.max(2,+s.maxPlayers||8)),
    aiMode:     !!s.aiMode
  }
}

function freshGame() {
  return { phase:'waiting',round:0,drawerIdx:0,drawerId:null,word:null,hint:null,
    timeLeft:0,timerInt:null,autoSel:null,revealAt:new Set() }
}

function startRound(room) {
  const g = room.game
  if (g.round >= room.settings.rounds) { endGame(room); return }
  g.round++; g.phase='word-select'; g.word=null; g.hint=null
  const all = [...room.players.map(p=>p.id),...room.bots.map(b=>b.id)]
  g.drawerId = all[(g.drawerIdx++)%all.length]
  room.players.forEach(p=>{p.hasGuessed=false;p.roundPts=0})
  room.bots.forEach(b=>{b.hasGuessed=false;b.roundPts=0})
  const words = pickWords(room.settings.difficulty,room.settings.aiMode)
  g.wordChoices = words
  bcast(room,'round-started',{round:g.round,totalRounds:room.settings.rounds,drawerId:g.drawerId,drawerName:dname(room,g.drawerId),drawerIsBot:isBot(room,g.drawerId)})
  bcast(room,'canvas-clear',{})
  if (isBot(room,g.drawerId)) {
    setTimeout(()=>botDraw(room,words[Math.floor(Math.random()*words.length)]),2400)
  } else {
    io.to(g.drawerId).emit('word-choices',words)
    g.autoSel=setTimeout(()=>{if(g.phase==='word-select')selectWord(room,words[0])},15000)
  }
  sync(room)
}

function botDraw(room,word) {
  const g=room.game
  g.word=word; g.phase='drawing'; g.timeLeft=room.settings.drawTime
  g.hint=[...word].map(c=>c===' '?'/':'_').join(' ')
  g.revealAt=new Set([Math.floor(g.timeLeft*.55),Math.floor(g.timeLeft*.28)])
  room.players.forEach(p=>io.to(p.id).emit('hint-init',{hint:g.hint,wordLen:word.length,isBotDrawing:true}))
  bcast(room,'phase-change',{phase:'drawing',drawerIsBot:true})
  const strokes=genStrokes(word); let delay=900
  strokes.forEach(stroke=>{setTimeout(()=>bcast(room,'bot-stroke',stroke),delay+Math.random()*180); delay+=460+(stroke.p?.length||3)*88})
  startTimer(room); sync(room)
}

function selectWord(room,word) {
  const g=room.game; clearTimeout(g.autoSel)
  g.word=word; g.phase='drawing'; g.timeLeft=room.settings.drawTime
  g.hint=[...word].map(c=>c===' '?'/':'_').join(' ')
  g.revealAt=new Set([Math.floor(g.timeLeft*.55),Math.floor(g.timeLeft*.28)])
  io.to(g.drawerId).emit('word-for-drawer',{word})
  room.players.filter(p=>p.id!==g.drawerId).forEach(p=>io.to(p.id).emit('hint-init',{hint:g.hint,wordLen:word.length,isBotDrawing:false}))
  bcast(room,'phase-change',{phase:'drawing',drawerIsBot:false})
  startTimer(room); sync(room)
}

function startTimer(room) {
  const g=room.game; clearInterval(g.timerInt)
  g.timerInt=setInterval(()=>{
    g.timeLeft--; bcast(room,'timer',g.timeLeft)
    if(g.revealAt?.has(g.timeLeft)) revealLetter(room)
    if(g.timeLeft<=0){clearInterval(g.timerInt);endRound(room)}
  },1000)
}

function revealLetter(room) {
  const g=room.game; if(!g.word||!g.hint) return
  const chs=g.hint.split(' '),hidden=chs.reduce((a,c,i)=>c==='_'?[...a,i]:a,[])
  if(!hidden.length) return
  const ri=hidden[Math.floor(Math.random()*hidden.length)]; chs[ri]=g.word[ri]; g.hint=chs.join(' ')
  room.players.filter(p=>p.id!==g.drawerId&&!p.hasGuessed).forEach(p=>io.to(p.id).emit('hint-update',g.hint))
}

function resolveGuess(room,player,bot,guess,target) {
  if(!target) return
  const g=room.game,e=player||bot
  const ok=guess===target||(target.includes(guess)&&guess.length>3)
  if(ok){
    e.hasGuessed=true
    const pts=Math.round(60+(g.timeLeft/room.settings.drawTime)*240)
    e.score=(e.score||0)+pts; e.roundPts=pts
    const drawer=getPlayer(room,g.drawerId)||getBot(room,g.drawerId)
    if(drawer){drawer.score=(drawer.score||0)+60;drawer.roundPts=(drawer.roundPts||0)+60}
    bcast(room,'correct-guess',{pid:e.id,name:e.name,points:pts,isBot:!!bot}); sync(room)
    const noneLeft=[...room.players,...room.bots].filter(x=>x.id!==g.drawerId&&!x.hasGuessed).length===0
    if(noneLeft){clearInterval(g.timerInt);endRound(room)}
  } else {
    bcast(room,'wrong-guess',{pid:e.id,name:e.name,guess,isBot:!!bot})
  }
}

function endRound(room) {
  const g=room.game; clearInterval(g.timerInt); clearTimeout(g.autoSel); g.phase='round-end'
  const scores=[
    ...room.players.map(p=>({id:p.id,name:p.name,avatar:ini(p.name),score:p.score,roundPts:p.roundPts||0,isBot:false})),
    ...room.bots.map(b=>({id:b.id,name:b.name,avatar:b.avatar,emoji:b.emoji,score:b.score||0,roundPts:b.roundPts||0,isBot:true}))
  ].sort((a,b)=>b.score-a.score)
  bcast(room,'round-ended',{word:g.word,round:g.round,totalRounds:room.settings.rounds,scores}); sync(room)
  setTimeout(()=>{if(rooms.has(room.code))startRound(room)},6500)
}

function endGame(room) {
  clearInterval(room.game.timerInt); room.game.phase='game-end'
  const scores=[
    ...room.players.map(p=>({id:p.id,name:p.name,avatar:ini(p.name),score:p.score,isBot:false})),
    ...room.bots.map(b=>({id:b.id,name:b.name,avatar:b.avatar,emoji:b.emoji,score:b.score||0,isBot:true}))
  ].sort((a,b)=>b.score-a.score).map((p,i)=>({...p,rank:i+1}))
  bcast(room,'game-ended',{scores}); sync(room)
  setTimeout(()=>rooms.delete(room.code),10*60*1000)
}

io.on('connection',socket=>{
  socket.data.rc=null

  socket.on('create-room',({name,settings={},addBot=false})=>{
    const code=genCode()
    const room={
      code,host:socket.id,settings:parseSettings(settings),players:[],
      bots:addBot?[{name:'AI',avatar:'AI',emoji:'🤖',type:'ai',id:`bot_ai_${Date.now().toString(36)}`,score:0,roundPts:0,hasGuessed:false,confidence:0.38,paceMs:7000}]:[],
      game:freshGame()
    }
    rooms.set(code,room)
    join(socket,room,name); socket.emit('room-created',{code,room:snap(room)}); sync(room)
  })

  socket.on('join-room',({code,name})=>{
    const room=getRoom(code?.toUpperCase())
    if(!room){socket.emit('join-error','Room not found');return}
    if(room.game.phase==='drawing'){socket.emit('join-error','Game already in progress');return}
    if(room.players.length>=room.settings.maxPlayers){socket.emit('join-error','Room is full');return}
    join(socket,room,name); socket.emit('room-joined',{room:snap(room)}); bcast(room,'player-joined',{id:socket.id,name:clean(name),avatar:ini(name)}); sync(room)
  })

  socket.on('update-settings',s=>{const r=getRoom(socket.data.rc);if(!r||r.host!==socket.id)return;r.settings=parseSettings(s);sync(r)})
  socket.on('start-game',()=>{
    const r=getRoom(socket.data.rc)
    if(!r||r.host!==socket.id)return
    if(r.players.length+r.bots.length<2){socket.emit('join-error','Need at least 2 players');return}
    r.players.forEach(p=>{p.score=0;p.roundPts=0}); r.bots.forEach(b=>{b.score=0;b.roundPts=0})
    r.game.round=0; r.game.drawerIdx=0; bcast(r,'game-started',{}); startRound(r)
  })
  socket.on('select-word',word=>{const r=getRoom(socket.data.rc);if(!r||r.game.drawerId!==socket.id||!r.game.wordChoices.includes(word))return;selectWord(r,word)})
  socket.on('stroke',d=>{const r=getRoom(socket.data.rc);if(r&&r.game.drawerId===socket.id)socket.to(r.code).emit('stroke',d)})
  socket.on('fill',d=>{const r=getRoom(socket.data.rc);if(r&&r.game.drawerId===socket.id)socket.to(r.code).emit('fill',d)})
  socket.on('undo',()=>{const r=getRoom(socket.data.rc);if(r&&r.game.drawerId===socket.id)socket.to(r.code).emit('undo')})
  socket.on('clear',()=>{const r=getRoom(socket.data.rc);if(r&&r.game.drawerId===socket.id)socket.to(r.code).emit('canvas-clear')})
  socket.on('bot-guess',({botId,guess})=>{const r=getRoom(socket.data.rc);if(!r)return;const bot=getBot(r,botId);if(!bot||bot.hasGuessed||botId===r.game.drawerId||r.game.phase!=='drawing')return;resolveGuess(r,null,bot,guess,r.game.word?.toLowerCase())})
  socket.on('guess',text=>{const r=getRoom(socket.data.rc);if(!r)return;const p=getPlayer(r,socket.id);if(!p||p.hasGuessed||socket.id===r.game.drawerId||r.game.phase!=='drawing')return;resolveGuess(r,p,null,String(text).trim().toLowerCase().slice(0,100),r.game.word?.toLowerCase())})
  socket.on('chat',text=>{const r=getRoom(socket.data.rc);if(!r)return;const p=getPlayer(r,socket.id);bcast(r,'chat',{id:socket.id,name:p?.name||'?',text:String(text).slice(0,200)})})
  socket.on('kick',tid=>{const r=getRoom(socket.data.rc);if(!r||r.host!==socket.id||tid===socket.id)return;const ts=io.sockets.sockets.get(tid);if(ts){ts.emit('kicked');remove(ts,r)}})
  socket.on('restart',()=>{const r=getRoom(socket.data.rc);if(!r||r.host!==socket.id||r.game.phase!=='game-end')return;r.players.forEach(p=>{p.score=0;p.roundPts=0});r.bots.forEach(b=>{b.score=0;b.roundPts=0});r.game=freshGame();bcast(r,'game-started',{});startRound(r)})
  socket.on('disconnect',()=>{const r=getRoom(socket.data.rc);if(r)remove(socket,r)})

  function join(sock,room,name){sock.data.rc=room.code;sock.join(room.code);room.players.push({id:sock.id,name:clean(name),score:0,roundPts:0,hasGuessed:false,avatar:ini(name)})}
  function remove(sock,room){room.players=room.players.filter(p=>p.id!==sock.id);sock.leave(room.code);sock.data.rc=null;if(!room.players.length){rooms.delete(room.code);return}bcast(room,'player-left',sock.id);if(room.host===sock.id&&room.players.length){room.host=room.players[0].id;io.to(room.host).emit('host-promoted')}if(room.game.drawerId===sock.id&&room.game.phase==='drawing'){clearInterval(room.game.timerInt);endRound(room)}sync(room)}
})

function snap(r){return{code:r.code,settings:r.settings,host:r.host,players:r.players,bots:r.bots.map(b=>({id:b.id,name:b.name,avatar:b.avatar,emoji:b.emoji,score:b.score||0})),game:{phase:r.game.phase}}}

http.listen(PORT,()=>{
  console.log(`\n  ⬡  Nexus Draw  →  http://localhost:${PORT}\n`)
})
