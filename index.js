const { WebSocketServer } = require("ws");
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

let users = new Map();
let rooms = new Map();

wss.on("connection", (socket) => {
  console.log(`server is listening on port: ${PORT}`);

  try {
    socket.on("message", (message) => {
      console.log("Message: ", JSON.parse(message));
      let data = Object.keys(message)?.length > 0 ? JSON.parse(message) : {};

      if (!data.userId || !data.therapistId) {
        return; //TODO do proper manage of error
      }

      if(data?.type=="connection"){
        if (!users.has(data?.userId)) {
          users.set(data.userId, socket);
        }
       if (!users.has(data?.therapistId)) {
          users.set(data.therapistId, socket);
        }
      }
      else if (data?.type == "appoinment") {
        if(!data.therapistId){
          return;
        }
        let therapistSocket = users.get(data?.therapistId);
          console.log("29..",{users},therapistSocket);
          const response = {
            message: data?.message || "appoinment_request",
            userId: data.userId,
            time: data.time,
            therapistId: data.therapistId,
          };
          therapistSocket.send(JSON.stringify(response));
      } else if (data?.type == "appoinment_fixed") {
        if (!data.roomId) {
          return; //TODO do proper manage of error
        }
        if (!rooms.has(data?.roomId)) {
          rooms.set(data.roomId, [data?.userId, data?.therapistId]);
        }
      } else if (data?.type == "chat") {
        if (!data.roomId) {
          return; //TODO do proper manage of error
        }
        let roomIdMembersInfo = rooms.get(data.roomId) || [];
        let receiverId = roomIdMembersInfo.find(
          (memId) => users.get(memId) != socket
        );
        let receiverSocket = users.get(receiverId);

        if (!receiverSocket) {
          return;
        }

        let resp = {
          message: data?.message,
          userId: data.userId,
          time: data.time,
          therapistId: data.therapistId,
        };

        receiverSocket.send(JSON.stringify(resp));
      }
    });
  } catch (error) {
    console.error("Message handling error:", err);
  }
  socket.on("close", () => {
    
    let sockets=[...users.entries()];
    
    let userid;

   for (let [key, value] of sockets) {
    if(value==socket){
      userid=key;
    }
  }
  console.log("82..",userid);

    users.delete(userid);
    
    console.log("Connection closed");
  });
  socket.on("error", console.error);
});
