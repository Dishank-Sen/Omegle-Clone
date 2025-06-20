import { User } from "./UserManager";

let GLOBAL_ROOM_ID = 1;

interface Room {
  user1: User,
  user2: User,
}

export class RoomManager {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map<string, Room>();
  }

  createRoom(user1: User, user2: User) {
    const roomId = this.generate().toString();
    this.rooms.set(roomId, { user1, user2 });

    user1.socket.emit("send-offer", {
      roomId,
      isInitiator: false,
    });

    user2.socket.emit("send-offer", {
      roomId,
      isInitiator: true,
    });
  }

  onOffer(roomId: string, sdp: string, senderSocketid: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    console.log("receiving user:", receivingUser.name);
    receivingUser.socket.emit("send-offer-to-other", {
      sdp,
      roomId,
    });
  }

  onAnswer(roomId: string, sdp: string, senderSocketid: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    receivingUser.socket.emit("send-answer-to-other", {
      sdp,
      roomId,
    });
  }

  onIceCandidates(roomId: string, candidate: any, senderSocketid: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    console.log("adding ice candidate")
    const receivingUser = room.user1.socket.id === senderSocketid ? room.user2 : room.user1;
    receivingUser.socket.emit("add-ice-candidate-to-other", {
      candidate
    });
  }

  generate() {
    return GLOBAL_ROOM_ID++;
  }
}
