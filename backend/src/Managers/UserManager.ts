import { Socket } from 'socket.io';
import { RoomManager } from './RoomManager';

export interface User {
  name: string,
  socket: Socket
}

export class UserManager {
  private users: User[];
  private userQueue: string[];
  private roomManager: RoomManager;

  constructor() {
    this.users = [];
    this.userQueue = [];
    this.roomManager = new RoomManager();
  }

  addUser(name: string, socket: Socket) {
    this.users.push({ name, socket });
    this.userQueue.push(socket.id);
    socket.emit("lobby");
    this.clearQueue();
    this.initHandlers(socket);
  }

  removeUser(socketId: string) {
    this.users = this.users.filter(x => x.socket.id !== socketId);
    this.userQueue = this.userQueue.filter(x => x !== socketId);
  }

  clearQueue() {
    if (this.userQueue.length < 2) return;

    const id1 = this.userQueue.pop();
    const id2 = this.userQueue.pop();

    const user1 = this.users.find(x => x.socket.id === id1);
    const user2 = this.users.find(x => x.socket.id === id2);

    if (!user1 || !user2) return;
    console.log("creating room");

    this.roomManager.createRoom(user1, user2);
    this.clearQueue();
  }

  initHandlers(socket: Socket) {
    socket.on("send-offer-to-server", ({ sdp, roomId }: { sdp: string, roomId: string }) => {
      console.log("offer received by other");
      this.roomManager.onOffer(roomId, sdp, socket.id);
    });

    socket.on("send-answer-to-server", ({ sdp, roomId }: { sdp: string, roomId: string }) => {
      this.roomManager.onAnswer(roomId, sdp, socket.id);
    });

    socket.on("add-ice-candidate-to-server", ({ candidate, roomId }) => {
      this.roomManager.onIceCandidates(roomId, candidate, socket.id);
    });
  }
}