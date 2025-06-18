import type { Socket } from "socket.io-client";

async function createAndSendOffer(socket: Socket, roomId: string) {
    const config = {
        iceServers: [
            {
            urls: "stun:stun.l.google.com:19302",
            },
        ],
        };

    const peerConnection = new RTCPeerConnection(config);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit("send-offer", { sdp: offer, roomId });
}

export default createAndSendOffer;