'use client';

import { useState, useEffect, useRef } from 'react';
import { useMouseRoom } from '../../hooks/useMouseRoom';

interface Peer {
  id: string;
  x: number;
  y: number;
}

// Color palette for different cursors
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export default function MouseRoomPage() {
  const [roomCode, setRoomCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastRenderTimeRef = useRef<number>(0);
  
  const { peers, isConnected, clientId, connect, disconnect, sendMousePosition } = useMouseRoom();
  
  // Interpolated peer positions for smooth animation
  const [interpolatedPeers, setInterpolatedPeers] = useState<Peer[]>([]);
  const targetPeersRef = useRef<Peer[]>([]);
  const currentPeersRef = useRef<Peer[]>([]);
  
  // Track your own mouse position
  const [myMousePos, setMyMousePos] = useState<{x: number, y: number} | null>(null);

  // Handle room connection
  const handleConnect = () => {
    if (roomCode.trim() && !isConnected) {
      setIsConnecting(true);
      connect(roomCode.trim());
    }
  };

  // Handle disconnection
  const handleDisconnect = () => {
    disconnect();
    setIsConnecting(false);
    setMyMousePos(null);
  };

  // Reset connecting state when connected
  useEffect(() => {
    if (isConnected) {
      setIsConnecting(false);
    }
  }, [isConnected]);

  // Update target positions when peers change
  useEffect(() => {
    targetPeersRef.current = peers;
  }, [peers]);

  // Smooth interpolation function
  const interpolate = (start: number, end: number, factor: number): number => {
    return start + (end - start) * factor;
  };

  // Animation loop for smooth cursor movement
  const animate = (currentTime: number) => {
    const deltaTime = currentTime - lastRenderTimeRef.current;
    lastRenderTimeRef.current = currentTime;
    
    // Interpolation factor (adjust for smoothness)
    const lerpFactor = Math.min(deltaTime / 16, 1); // Target 60fps
    
    // Update current positions towards target positions
    const newInterpolatedPeers = targetPeersRef.current.map(targetPeer => {
      const currentPeer = currentPeersRef.current.find(p => p.id === targetPeer.id);
      
      if (currentPeer) {
        return {
          id: targetPeer.id,
          x: interpolate(currentPeer.x, targetPeer.x, lerpFactor),
          y: interpolate(currentPeer.y, targetPeer.y, lerpFactor)
        };
      } else {
        return { ...targetPeer };
      }
    });
    
    // Remove peers that are no longer in target
    const filteredPeers = newInterpolatedPeers.filter(peer => 
      targetPeersRef.current.some(target => target.id === peer.id)
    );
    
    currentPeersRef.current = filteredPeers;
    setInterpolatedPeers(filteredPeers);
    
    // Render the canvas
    renderCanvas(filteredPeers);
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Canvas rendering function
  const renderCanvas = (peersToRender: Peer[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a test circle to verify canvas is working (top-left corner)
    ctx.beginPath();
    ctx.arc(30, 30, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#00FF00';
    ctx.fill();
    
    // Draw your own cursor first (always on top)
    if (myMousePos) {
      const x = myMousePos.x * canvas.width;
      const y = myMousePos.y * canvas.height;
      
      // Draw your cursor with a special style
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, 2 * Math.PI);
      ctx.fillStyle = '#FF0000'; // Red for your cursor
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 4;
      ctx.stroke();
      
      // Draw "YOU" label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', x, y - 25);
    }
    
    // Draw each peer's cursor
    peersToRender.forEach((peer, index) => {
      const color = CURSOR_COLORS[index % CURSOR_COLORS.length];
      const x = peer.x * canvas.width;
      const y = peer.y * canvas.height;
      
      // Draw cursor circle
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw cursor ID
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(peer.id.substring(0, 4), x, y - 15);
    });
  };

  // Start animation loop
  useEffect(() => {
    const startAnimation = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    startAnimation();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Track your own mouse position
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isConnected) {
        const x = event.clientX / window.innerWidth;
        const y = event.clientY / window.innerHeight;
        
        // Update local position immediately (snappy red cursor)
        setMyMousePos({ x, y });
        
        // Send to server so others can see it
        sendMousePosition(x, y);
      }
    };

    if (isConnected) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isConnected, sendMousePosition]);

  return (
    <div className="relative w-full h-screen bg-gray-100">
      {/* Connection UI */}
      {!isConnected && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-95 z-10">
          <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
            <h1 className="text-2xl font-bold mb-4 text-center text-black">Mouse Room</h1>
            <div className="space-y-4">
              <div>
                <label htmlFor="roomCode" className="block text-sm font-medium text-black mb-2">
                  Room Code
                </label>
                <input
                  id="roomCode"
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value)}
                  placeholder="Enter room code..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                />
              </div>
              <button
                onClick={handleConnect}
                disabled={!roomCode.trim() || isConnecting}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Connected UI */}
      {isConnected && (
        <div className="absolute top-4 left-4 bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-10 border border-gray-200">
          <div className="text-sm text-black">
            <div><strong>Room:</strong> {roomCode}</div>
            <div><strong>Your ID:</strong> {clientId}</div>
            <div><strong>Connected:</strong> {peers.length + 1} players</div>
            <div><strong>Mouse:</strong> {myMousePos ? `${(myMousePos.x * 100).toFixed(0)}%, ${(myMousePos.y * 100).toFixed(0)}%` : 'Not tracking'}</div>
            <div><strong>Peers:</strong> {peers.length} visible</div>
          </div>
          <button
            onClick={handleDisconnect}
            className="mt-2 bg-red-500 text-white py-1 px-3 rounded text-sm hover:bg-red-600 font-medium"
          >
            Disconnect
          </button>
        </div>
      )}
      
      {/* Canvas for cursor rendering */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ cursor: 'none' }}
      />
      
      {/* Test cursor - always visible when connected */}
      {isConnected && (
        <div
          className="fixed pointer-events-none z-30"
          style={{
            left: '50px',
            top: '50px',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
            TEST
          </div>
        </div>
      )}
      
      {/* Physical cursor elements on top of everything */}
      {isConnected && myMousePos && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: `${myMousePos.x * 100}%`,
            top: `${myMousePos.y * 100}%`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="relative">
            {/* Red cursor circle */}
            <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
            {/* YOU label */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              YOU
            </div>
          </div>
        </div>
      )}
      
      {/* Other players' cursors */}
      {isConnected && peers.map((peer, index) => {
        const color = CURSOR_COLORS[index % CURSOR_COLORS.length];
        return (
          <div
            key={peer.id}
            className="fixed pointer-events-none z-40"
            style={{
              left: `${peer.x * 100}%`,
              top: `${peer.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="relative">
              {/* Colored cursor circle */}
              <div 
                className="w-5 h-5 rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: color }}
              ></div>
              {/* Peer ID label */}
              <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                {peer.id.substring(0, 4)}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Instructions */}
      {isConnected && (
        <div className="absolute bottom-4 right-4 bg-white bg-opacity-95 p-4 rounded-lg shadow-lg z-10 border border-gray-200">
          <div className="text-sm text-black">
            <div>Move your mouse to share your cursor position</div>
            <div>Open multiple browser windows to test multiplayer</div>
            <div className="mt-2 text-xs text-gray-600">
              Red cursor = You | Colored cursors = Other players
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
