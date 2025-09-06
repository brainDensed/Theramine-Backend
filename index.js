const { WebSocketServer } = require("ws");
const verbwire = require("@api/verbwire");
const admin = require("./firebaseAdmin");

const { registerDIDForUser } = require("./registerDid");
const { randomUUID } = require("crypto");
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

let users = new Map();
let rooms = new Map();

wss.on("connection", (socket) => {
  console.log(`server is listening on port: ${PORT}`);
  verbwire.auth(process.env.VERBWIRE_API_KEY);

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
                  const userWallet = data.walletAddress;
                  if (!userWallet) {
                    socket.send(
                      JSON.stringify({
                        error: "Missing wallet address for DID registration",
                      })
                    );
                    return;
                  }
                  const didString = `did:theramine:${randomUUID()}`;
                  const result = await registerDIDForUser(
                    userWallet,
                    didString
                  );

                  // Mint NFT if this is a new DID registration
                  if (!result.alreadyRegistered) {
                    try {
                      const mintResponse =
                        await verbwire.postNftMintQuickmintfrommetadata({
                          chain: "sepolia",
                          name: "Theramine Login Badge",
                          description:
                            "Awarded for registering a DID on Theramine",
                          imageUrl: "https://ipfs.io/ipfs/bafybeifponvvbpykojqgjfyuuwuslzzfja6mmn6p7bipdc7a53xm4rk5lu", // Replace with your badge image URL
                          recipientAddress: userWallet,
                          contractAddress: "0xBEe8Ec530fC4df32CDCB0B1cb90a40E5675528E2",
                          data: JSON.stringify({
                            attributes: [
                              { trait_type: "Badge Type", value: "Login" },
                              { trait_type: "Platform", value: "Theramine" },
                            ],
                          }),
                        });
                      console.log("mint response", mintResponse);
                      socket.send(
                        JSON.stringify({
                          did: result.did,
                          status: "DID registered",
                          nft: mintResponse,
                        })
                      );
                    } catch (mintErr) {
                      socket.send(
                        JSON.stringify({
                          did: result.did,
                          status: "DID registered",
                          nftError: "NFT minting failed",
                        })
                      );
                    }
                  } else {
                    socket.send(
                      JSON.stringify({
                        did: result.did,
                        status: "DID already registered",
                      })
                    );
                  }
                } catch (err) {
                  socket.send(
                    JSON.stringify({
                      error: "DID registration failed",
                      details: err.message,
                    })
                  );
                }
                // ...existing code...
              } else {
                socket.send(JSON.stringify({ error: "Phone number mismatch" }));
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
          roomId: data.roomId,
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
        // Chat message relay logic can be added here if needed
      }
    });
  } catch (err) {
    console.error("WebSocket error:", err);
  }
});
