// Room.tsx
import { useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import socket from "../socket";

function Room() {
  const [searchParams] = useSearchParams();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const name = searchParams.get("name");
  const config = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected to server with id:", socket.id);
    });

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    if (name) {
      socket.emit("send-user", { name });
    }

    socket.on("send-offer", async ({ roomId, isInitiator }) => {
      console.log("send-offer received", { roomId, isInitiator });
      const peerConnection = new RTCPeerConnection(config);
      peerConnectionRef.current = peerConnection;

      // Add local tracks
      localStreamRef.current?.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // ICE candidate gathering
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: event.candidate,
            roomId,
          });
        }
      };

      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("offer-to-other", { sdp: offer, roomId });
        console.log("Offer sent", offer);
      } else {
        const userAccepts = window.confirm("Someone wants to chat. Accept?");
        socket.emit("answer", { roomId, userAccepts });
      }
    });

    socket.on("offer-from-other", async ({ sdp, roomId }) => {
      console.log("Received offer from other");
      const peerConnection = new RTCPeerConnection(config);
      peerConnectionRef.current = peerConnection;

      // Add local tracks
      localStreamRef.current?.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });

      // Handle remote tracks
      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      // ICE candidate gathering
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("add-ice-candidate", {
            candidate: event.candidate,
            roomId,
          });
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit("send-answer", { sdp: answer, roomId });
    });

    socket.on("answer", async ({ sdp }) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
        console.log("Answer set successfully");
      }
    });

    socket.on("add-ice-candidate", ({ candidate }) => {
      if (peerConnectionRef.current && candidate) {
        peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on("offer-status", ({ roomId, offerStatus }) => {
      if (offerStatus) {
        window.alert("Connection successful");
      } else {
        window.alert("Connection failed");
      }
    });

    socket.on("lobby", () => {
      console.log("inside lobby");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <p>{name}</p>
      <div style={{ display: "flex", gap: "20px" }}>
        <video ref={localVideoRef} autoPlay muted playsInline width="300" />
        <video ref={remoteVideoRef} autoPlay playsInline width="300" />
      </div>
    </div>
  );
}

export default Room;
