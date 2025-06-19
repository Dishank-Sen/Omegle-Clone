import { Socket } from "socket.io";
import http from "http";

import express from 'express';
import { Server } from 'socket.io';
import { UserManager } from "./Managers/UserManager";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

const userManager = new UserManager();

io.on('connection', (socket: Socket) => {
  console.log('a user connected with id:', socket.id);
  
  socket.on("send-user", ({name}) => {
    console.log(name)
    if(name){
      userManager.addUser(name, socket)
    }
  })
  // userManager.addUser("randomName", socket);

  socket.on("response", async ({ userAccepts}) => {
    if(userAccepts){
      socket.emit("offer-status", { offerStatus: userAccepts})
    }else{
      socket.emit("offer-status", { offerStatus: userAccepts})
    }
  })


  socket.on("disconnect", () => {
    console.log("user disconnected");
    userManager.removeUser(socket.id);
  })
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});