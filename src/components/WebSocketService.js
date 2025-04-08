const WebSocketService = {
    connect: (onMessage) => {
      console.log("Connecting to WebSocket...");
      setInterval(() => {
        onMessage({
          tables: Array(12).fill({ status: Math.random() > 0.5 ? "Available" : "Occupied" }),
          queue: [
            { id: 1, name: "John", groupSize: 4, status: "Waiting" },
            { id: 2, name: "Sarah", groupSize: 2, status: "Waiting" },
          ],
        });
      }, 5000); // Simulating updates every 5 sec
    },
  
    sendUpdate: (data) => {
      console.log("Sending update:", data);
    },
  };
  
  export default WebSocketService;
  