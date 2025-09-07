const WebSocket = require('ws');
const http = require('http');

// In-memory storage for rooms and clients
const rooms = new Map(); // roomCode -> Set of WebSocket connections
const clients = new Map(); // WebSocket -> { roomCode, id, username, isAlive }

// Generate unique client ID
function generateClientId() {
  return Math.random().toString(36).substr(2, 9);
}

// Create HTTP server with health check endpoint
const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      connections: wss.clients.size,
      rooms: rooms.size
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');
  
  // Initialize client with heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join':
          handleJoin(ws, message.roomCode, message.username);
          break;
        case 'mouse':
          handleMouseMove(ws, message);
          break;
        case 'ping':
          // Respond to client ping
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    handleDisconnect(ws);
  });
});

function handleJoin(ws, roomCode, username) {
  const clientId = generateClientId();
  const displayUsername = username && username.trim() ? username.trim() : `User_${clientId.substring(0, 4)}`;
  
  // Remove client from any existing room
  if (clients.has(ws)) {
    const existingClient = clients.get(ws);
    removeClientFromRoom(existingClient.roomCode, ws);
  }
  
  // Add client to new room
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }
  
  rooms.get(roomCode).add(ws);
  clients.set(ws, { roomCode, id: clientId, username: displayUsername, isAlive: true });
  
  // Send confirmation with client ID
  ws.send(JSON.stringify({
    type: 'joined',
    clientId: clientId,
    roomCode: roomCode
  }));
  
  // Notify other clients in the room about the new peer
  notifyPeerJoin(roomCode, clientId, displayUsername, ws);
  
  console.log(`Client ${clientId} (${displayUsername}) joined room ${roomCode}`);
}

function handleMouseMove(ws, message) {
  const client = clients.get(ws);
  if (!client) return;
  
  const room = rooms.get(client.roomCode);
  if (!room) return;
  
  // Broadcast mouse position to all other clients in the room with timestamp
  const mouseMessage = JSON.stringify({
    type: 'mouse',
    id: client.id,
    username: client.username,
    x: message.x,
    y: message.y,
    t: Date.now()
  });
  
  room.forEach((clientWs) => {
    if (clientWs !== ws && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(mouseMessage);
    }
  });
}

function handleDisconnect(ws) {
  const client = clients.get(ws);
  if (client) {
    // Notify other clients about the peer leaving
    notifyPeerLeave(client.roomCode, client.id);
    removeClientFromRoom(client.roomCode, ws);
    clients.delete(ws);
    console.log(`Client ${client.id} disconnected from room ${client.roomCode}`);
  }
}

function removeClientFromRoom(roomCode, ws) {
  const room = rooms.get(roomCode);
  if (room) {
    room.delete(ws);
    if (room.size === 0) {
      rooms.delete(roomCode);
      console.log(`Room ${roomCode} deleted (empty)`);
    }
  }
}

// Notify other clients when a peer joins
function notifyPeerJoin(roomCode, clientId, username, joiningWs) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const peerJoinMessage = JSON.stringify({
    type: 'peer-join',
    id: clientId,
    username: username
  });
  
  room.forEach((ws) => {
    if (ws !== joiningWs && ws.readyState === WebSocket.OPEN) {
      ws.send(peerJoinMessage);
    }
  });
}

// Notify other clients when a peer leaves
function notifyPeerLeave(roomCode, clientId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const peerLeaveMessage = JSON.stringify({
    type: 'peer-leave',
    id: clientId
  });
  
  room.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(peerLeaveMessage);
    }
  });
}

// Heartbeat system to keep connections alive
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('Terminating dead connection');
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Check every 30 seconds

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log('Features enabled:');
  console.log('- Room-based mouse sharing');
  console.log('- Peer join/leave notifications');
  console.log('- Timestamped mouse messages');
  console.log('- Heartbeat keepalive (30s)');
});
