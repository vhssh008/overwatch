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
    color: 0x0088ff
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
    if(players[data.targetId]){
      players[data.targetId].hp -= data.damage;
      io.emit('playerDamaged', {
        targetId: data.targetId,
        damage: data.damage,
        hp: players[data.targetId].hp
      });
      if(players[data.targetId].hp <= 0){
        io.emit('playerKilled', {
          killerId: data.shooterId,
          killerName: data.shooterName || '???',
          victimId: data.targetId,
          victimName: players[data.targetId].name || '???'
        });
        players[data.targetId].hp = 200;
      }
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