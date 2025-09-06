
const { WebSocketServer } = require("ws");
const admin = require("./firebaseAdmin");

const { registerDIDForUser } = require("./registerDid");
const { randomUUID } = require("crypto");
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

let users = new Map();
let rooms = new Map();


wss.on("connection", (socket) => {
  console.log(`server is listening on port: ${PORT}`);

  try {
    socket.on("message", (message) => {
      let data = Object.keys(message)?.length > 0 ? JSON.parse(message) : {};

      if (!data.userId && !data.therapistId) {
        return; //TODO do proper manage of error
      }

      // If user, require Firebase ID token verification
      if (data.type == "connection") {
        if (data?.userId) {
          // Expect idToken from frontend for users
          if (!data.idToken) {
            socket.send(JSON.stringify({ error: "Missing ID token" }));
            return;
          }
          admin
            .auth()
            .verifyIdToken(data.idToken)
            .then(async (decodedToken) => {
              // Optionally, check phone_number matches data.userId
              if (
                decodedToken.phone_number &&
                decodedToken.phone_number === data.userId
              ) {
                users.set(data.userId, socket);
                // Automatically register DID after phone verification
                try {
                  // Use wallet address from frontend if available, else from decodedToken (if mapped)
                  const userWallet = data.walletAddress;
                  if (!userWallet) {
                    socket.send(JSON.stringify({ error: "Missing wallet address for DID registration" }));
                    return;
                  }
                  const didString = `did:theramine:${randomUUID()}`;
                  const result = await registerDIDForUser(userWallet, didString);
                  socket.send(
                    JSON.stringify({
                      did: result.did,
                      status: result.alreadyRegistered ? "DID already registered" : "DID registered"
                    })
                  );
                } catch (err) {
                  socket.send(JSON.stringify({ error: "DID registration failed", details: err.message }));
                }
              } else {
                socket.send(
                  JSON.stringify({ error: "Phone number mismatch" })
                );
              }
            })
            .catch((err) => {
              socket.send(
                JSON.stringify({ error: "Invalid or expired ID token" })
              );
            });
          return;
        }
        if (data?.therapistId) {
          // Therapists are identified by walletId, skip phone check
          users.set(data.therapistId, socket);
        }
      } else if (data?.type == "appoinment") {
        if (!data.therapistId) {
          return;
        }
        let therapistSocket = users.get(data?.therapistId);
        const response = {
          message: data?.message || "appoinment_request",
          userId: data.userId,
          time: data.time,
          therapistId: data.therapistId,
        };
        if (therapistSocket) therapistSocket.send(JSON.stringify(response));
      } else if (data?.type == "appoinment_fixed") {
        if (!data.roomId && !data.therapistId && !data.userId) {
          return; //TODO do proper manage of error
        }
        if (!rooms.has(data?.roomId)) {
          rooms.set(data.roomId, [data?.userId, data?.therapistId]);
        }

        let userSocket = users.get(data.userId);
        const response = {
          message: "appoinment_fixed",
          userId: data.userId,
          time: data.time,
          therapistId: data.therapistId,
          roomId:data.roomId
        };

        if (userSocket) userSocket.send(JSON.stringify(response));
      } else if (data?.type == "chat") {
        if (!data.roomId) {
          return; //TODO do proper manage of error
        }
        let roomIdMembersInfo = rooms.get(data.roomId) || [];
        let receiverId = roomIdMembersInfo.find(
          (memId) => users.get(memId) != socket
        );
        let receiverSocket = users.get(receiverId);
        if (receiverSocket) {
          // Forward the chat message to the other participant
          receiverSocket.send(
            JSON.stringify({
              type: "chat",
              message: data.message,
              userId: data.userId,
              therapistId: data.therapistId,
              roomId: data.roomId,
              time: data.time || Date.now(),
            })
          );
        }
      }
    });
  } catch (err) {
    console.error("WebSocket error:", err);
  }
});
