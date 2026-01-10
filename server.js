const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

let rooms = {}; // { roomId: { drawnNumbers: [], players: {} } }

io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  socket.on("joinRoom", ({ role, room, name }) => {
    socket.join(room);
    if (!rooms[room]) rooms[room] = { drawnNumbers: [], players: {} };
    if (role === "player") rooms[room].players[socket.id] = name;

    // Send current drawn numbers to new user
    socket.emit("numberUpdate", rooms[room].drawnNumbers);
  });

  socket.on("drawNumber", (room) => {
    if (!rooms[room]) rooms[room] = { drawnNumbers: [], players: {} };

    let allNumbers = Array.from({ length: 90 }, (_, i) => i + 1);
    let remaining = allNumbers.filter(
      (n) => !rooms[room].drawnNumbers.includes(n)
    );

    if (remaining.length === 0) return;

    let num = remaining[Math.floor(Math.random() * remaining.length)];
    rooms[room].drawnNumbers.push(num);

    // Send updated array to all players & host
    io.to(room).emit("numberUpdate", rooms[room].drawnNumbers);
  });

  socket.on("endGame", (room) => {
    io.to(room).emit("gameOver");
    delete rooms[room];
  });

  socket.on("disconnect", () => {
    for (let room in rooms) {
      if (rooms[room].players[socket.id]) delete rooms[room].players[socket.id];
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
