const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public 폴더에서 게임 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

const players = {};

io.on('connection', (socket) => {
  console.log('플레이어 접속:', socket.id);

  // 새 플레이어 추가
  players[socket.id] = {
    id: socket.id,
    x: 0, y: 1.7, z: 25,
    yaw: 0, pitch: 0,
    hp: 200,
    character: 'soldier',
    name: '플레이어'
  };

  // 접속한 플레이어에게 현재 모든 플레이어 정보 전송
  socket.emit('currentPlayers', players);

  // 다른 플레이어들에게 새 플레이어 알림
  socket.broadcast.emit('newPlayer', players[socket.id]);

  // 플레이어 움직임 업데이트
  socket.on('playerMove', (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].z = data.z;
      players[socket.id].yaw = data.yaw;
      players[socket.id].pitch = data.pitch;
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  // 총 발사
  socket.on('playerShoot', (data) => {
    socket.broadcast.emit('playerShot', {
      id: socket.id,
      ...data
    });
  });

  // 피격
  socket.on('playerHit', (data) => {
    if (players[data.targetId]) {
      players[data.targetId].hp -= data.damage;
      io.emit('playerDamaged', {
        targetId: data.targetId,
        damage: data.damage,
        hp: players[data.targetId].hp
      });
    }
  });

  // 접속 종료
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