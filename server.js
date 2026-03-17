const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
  console.log('플레이어 접속:', socket.id);

  players[socket.id] = {
    id: socket.id,
    x: 0, y: 1.7, z: 25,
    yaw: 0, pitch: 0,
    hp: 200,
    name: '플레이어',
    color: 0x0088ff,
    dead: false
  };

  socket.emit('currentPlayers', players);
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('setName', (name) => {
    if(players[socket.id]) players[socket.id].name = name;
  });

  socket.on('setColor', (color) => {
    if(players[socket.id]) players[socket.id].color = color;
  });

  socket.on('playerMove', (data) => {
    if(players[socket.id]){
      Object.assign(players[socket.id], data);
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('playerHit', (data) => {
    const target = players[data.targetId];
    if(!target || target.dead) return; // 이미 죽은 상태면 무시

    target.hp -= data.damage;

    io.emit('playerDamaged', {
      targetId: data.targetId,
      damage: data.damage,
      hp: target.hp
    });

    if(target.hp <= 0 && !target.dead){
      target.dead = true; // 죽음 처리 즉시 잠금
      io.emit('playerKilled', {
        killerId: data.shooterId,
        killerName: data.shooterName || '???',
        victimId: data.targetId,
        victimName: target.name || '???'
      });
      // 2.6초 후 리스폰
      setTimeout(() => {
        if(players[data.targetId]){
          players[data.targetId].hp = 200;
          players[data.targetId].dead = false;
        }
      }, 2600);
    }
  });

  socket.on('disconnect', () => {
    console.log('플레이어 퇴장:', socket.id);
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});