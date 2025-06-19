import { useSearchParams } from "react-router-dom";
import { useEffect, useRef } from "react";
import socket from "../socket";

function Room() {
  const [searchParams] = useSearchParams();
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]); // ✅ Buffer for early ICE

  const name = searchParams.get("name");

  useEffect(() => {
    const config = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };

    socket.on("connect", () => {
      console.log("Connected to server with id:", socket.id);
    });

    if (name) {
      socket.emit("send-user", { name });
    }

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    socket.on("send-offer", async ({ roomId, isInitiator }) => {
      console.log("send-offer received", { roomId, isInitiator });

      const peerConnection = new RTCPeerConnection(config);
      peerConnectionRef.current = peerConnection;

      localStreamRef.current?.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });

      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("add-ice-candidate-to-server", {
            candidate: event.candidate,
            roomId,
          });
        }
      };

      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit("send-offer-to-server", { sdp: offer, roomId });
        console.log("Offer sent");
      } else {
        const userAccepts = window.confirm("Someone wants to chat. Accept?");
        socket.emit("response", { userAccepts });
      }
    });

    socket.on("send-offer-to-other", async ({ sdp, roomId }) => {
      console.log("Received offer from other");

      if (!localStreamRef.current) {
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }

      const peerConnection = new RTCPeerConnection(config);
      peerConnectionRef.current = peerConnection;

      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });

      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      peerConnection.onicecandidate = (event) => {
        console.log("in ice candidate");
        if (event.candidate) {
          socket.emit("add-ice-candidate-to-server", {
            candidate: event.candidate,
            roomId,
          });
        }
      };

      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

      // ✅ Process buffered ICE candidates
      pendingCandidatesRef.current.forEach(candidate =>
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
      );
      pendingCandidatesRef.current = [];

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log("set the LD and RD");
      socket.emit("send-answer-to-server", { sdp: answer, roomId });
    });

    socket.on("send-answer-to-other", async ({ sdp }) => {
      const peerConnection = peerConnectionRef.current;
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));

        // ✅ Flush any pending ICE candidates
        pendingCandidatesRef.current.forEach(candidate =>
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error)
        );
        pendingCandidatesRef.current = [];

        console.log("Answer set successfully");
      }
    });

    socket.on("add-ice-candidate-to-other", ({ candidate }) => {
      const peerConnection = peerConnectionRef.current;

      if (peerConnection) {
        if (peerConnection.remoteDescription) {
          peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .then(() => console.log("ICE candidate added"))
            .catch(err => console.error("Error adding ICE candidate", err));
        } else {
          console.log("Remote description not set yet, queuing candidate");
          pendingCandidatesRef.current.push(candidate);
        }
      }
    });

    socket.on("offer-status", ({ offerStatus }) => {
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
        <video ref={localVideoRef} autoPlay muted playsInline width="500" />
        <video ref={remoteVideoRef} autoPlay playsInline width="300" />
      </div>
    </div>
  );
}

export default Room;
