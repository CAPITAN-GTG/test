# Real-time Multiplayer Mouse Sharing System

A Next.js application with WebSocket-based real-time mouse cursor sharing between multiple users in the same room.

## Features

- **Real-time mouse sharing**: See other users' mouse cursors in real-time
- **Room-based system**: Join rooms with custom room codes
- **Performance optimized**: 30fps throttling, smooth interpolation, requestAnimationFrame rendering
- **In-memory storage**: No database required for testing
- **Responsive design**: Works on different screen sizes

## Architecture

### WebSocket Server (`server.js`)
- Handles client connections and room management
- Broadcasts mouse positions to all clients in the same room
- Tracks connected clients in memory
- Runs on port 8080

### React Hook (`hooks/useMouseRoom.ts`)
- Manages WebSocket connection
- Tracks mouse movements and sends normalized coordinates (0-1)
- Provides peer positions and connection status
- Includes throttling for performance

### Demo Page (`app/mouse-room/page.tsx`)
- Full-screen canvas for rendering cursors
- Room connection interface
- Smooth cursor interpolation
- Different colors for each user

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the WebSocket Server
```bash
npm run ws-server
```

### 3. Start the Next.js Development Server
```bash
npm run dev
```

### 4. Run Both Servers Together (Recommended)
```bash
npm run dev:full
```

## Usage

1. Open your browser and go to `http://localhost:3000`
2. Click "Enter Mouse Room"
3. Enter a room code (e.g., "test123")
4. Click "Connect"
5. Move your mouse to share your cursor position
6. Open another browser window/tab and join the same room to see multiplayer functionality

## Testing Multiplayer

1. Open multiple browser windows or tabs
2. Navigate to `http://localhost:3000/mouse-room` in each
3. Enter the same room code in all windows
4. Move your mouse in one window and see it appear in others
5. Each user gets a different colored cursor

## Performance Optimizations

- **Throttling**: Mouse position updates are throttled to 30fps
- **Interpolation**: Smooth cursor movement using linear interpolation
- **RequestAnimationFrame**: Optimized rendering loop
- **Normalized coordinates**: Mouse positions are normalized (0-1) for cross-device compatibility

## Technical Details

### WebSocket Messages

**Client to Server:**
```json
// Join room
{
  "type": "join",
  "roomCode": "test123"
}

// Mouse position
{
  "type": "mouse",
  "x": 0.5,
  "y": 0.3
}
```

**Server to Client:**
```json
// Join confirmation
{
  "type": "joined",
  "clientId": "abc123",
  "roomCode": "test123"
}

// Mouse position from other client
{
  "type": "mouse",
  "id": "def456",
  "x": 0.7,
  "y": 0.4
}
```

### File Structure
```
test/
├── server.js                 # WebSocket server
├── hooks/
│   └── useMouseRoom.ts      # React hook for mouse sharing
├── app/
│   ├── page.tsx             # Home page
│   ├── mouse-room/
│   │   └── page.tsx         # Mouse room demo page
│   └── layout.tsx           # Root layout
└── package.json
```

## Future Enhancements

- Add Redis for persistent room storage
- Implement user authentication
- Add cursor trails and effects
- Support for touch devices
- Room history and statistics
- Custom cursor styles
