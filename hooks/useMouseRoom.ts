import { useState, useEffect, useRef, useCallback } from 'react';

interface Peer {
  id: string;
  x: number;
  y: number;
}

interface UseMouseRoomReturn {
  peers: Peer[];
  isConnected: boolean;
  clientId: string | null;
  connect: (roomCode: string) => void;
  disconnect: () => void;
  sendMousePosition: (x: number, y: number) => void;
}

export function useMouseRoom(): UseMouseRoomReturn {
  const [peers, setPeers] = useState<Peer[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const lastMouseUpdateRef = useRef<number>(0);
  const mouseThrottleRef = useRef<number>(1000 / 30); // 30fps throttling
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Throttled mouse position sender
  const sendMousePosition = useCallback((x: number, y: number) => {
    const now = Date.now();
    if (now - lastMouseUpdateRef.current < mouseThrottleRef.current) {
      return;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mouse',
        x,
        y
      }));
      lastMouseUpdateRef.current = now;
    }
  }, []);

  // Mouse move handler
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isConnected) return;
    
    const x = event.clientX / window.innerWidth;
    const y = event.clientY / window.innerHeight;
    
    sendMousePosition(x, y);
  }, [isConnected, sendMousePosition]);

  // Connect to room
  const connect = useCallback((roomCode: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.NEXT_PUBLIC_WS_URL || 'wss://test-production-0d81.up.railway.app')
      : 'ws://localhost:8080';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    roomCodeRef.current = roomCode;

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        type: 'join',
        roomCode: roomCode
      }));
      
      // Start client-side heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000); // Send ping every 25 seconds
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'joined':
            setClientId(message.clientId);
            setIsConnected(true);
            console.log('Joined room:', message.roomCode, 'with ID:', message.clientId);
            break;
            
          case 'mouse':
            setPeers(prevPeers => {
              const existingPeerIndex = prevPeers.findIndex(peer => peer.id === message.id);
              
              if (existingPeerIndex >= 0) {
                // Update existing peer
                const updatedPeers = [...prevPeers];
                updatedPeers[existingPeerIndex] = {
                  id: message.id,
                  x: message.x,
                  y: message.y
                };
                return updatedPeers;
              } else {
                // Add new peer
                return [...prevPeers, {
                  id: message.id,
                  x: message.x,
                  y: message.y
                }];
              }
            });
            break;
            
          case 'peer-join':
            console.log('Peer joined:', message.id);
            // Peer will appear when they send their first mouse message
            break;
            
          case 'peer-leave':
            console.log('Peer left:', message.id);
            setPeers(prevPeers => prevPeers.filter(peer => peer.id !== message.id));
            break;
            
          case 'pong':
            // Heartbeat response - connection is alive
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setClientId(null);
      setPeers([]);
      
      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, []);

  // Disconnect from room
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Clear heartbeat interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    roomCodeRef.current = null;
    setIsConnected(false);
    setClientId(null);
    setPeers([]);
  }, []);

  // Set up mouse tracking
  useEffect(() => {
    if (isConnected) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };
    }
  }, [isConnected, handleMouseMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  return {
    peers,
    isConnected,
    clientId,
    connect,
    disconnect,
    sendMousePosition
  };
}
