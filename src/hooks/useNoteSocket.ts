/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { User } from '../types.ts';

export interface RemoteCursor {
  userId: string;
  userName: string;
  x: number;
  y: number;
}

export interface TypingUser {
  userId: string;
  userName: string;
}

export interface LiveChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

export function useNoteSocket(
  noteId: string | null,
  currentUser: User | null,
  onRemoteSync: (newContent: string) => void
) {
  const [presenceUsers, setPresenceUsers] = useState<Omit<User, 'blocked' | 'role' | 'createdAt'>[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!noteId || !currentUser) {
      setPresenceUsers([]);
      setRemoteCursors({});
      setTypingUsers({});
      setChatMessages([]);
      setIsConnected(false);
      return;
    }

    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${loc.host}/ws`;

    let socket: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        // Send join event
        socket.send(JSON.stringify({
          type: 'join',
          payload: {
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            noteId
          }
        }));
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, payload } = message;

          if (type === 'presence') {
            setPresenceUsers(payload.users);
          } 
          
          else if (type === 'chat_history') {
            setChatMessages(payload.history);
          }

          else if (type === 'chat_message') {
            setChatMessages(prev => [...prev, payload]);
          }

          else if (type === 'cursor') {
            const { userId, userName, cursor } = payload;
            if (cursor) {
              setRemoteCursors(prev => ({
                ...prev,
                [userId]: { userId, userName, x: cursor.x, y: cursor.y }
              }));
            } else {
              setRemoteCursors(prev => {
                const updated = { ...prev };
                delete updated[userId];
                return updated;
              });
            }
          } 
          
          else if (type === 'typing') {
            const { userId, userName, isTyping } = payload;
            setTypingUsers(prev => {
              const updated = { ...prev };
              if (isTyping) {
                updated[userId] = { userId, userName };
              } else {
                delete updated[userId];
              }
              return updated;
            });
          } 
          
          else if (type === 'sync') {
            onRemoteSync(payload.content);
          }
        } catch (err) {
          console.error('Remote sync payload error:', err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        // Auto-reconnect after 3 seconds
        reconnectTimer = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      if (socket) {
        socket.onclose = null; // Prevent reconnection trigger
        socket.close();
      }
      clearTimeout(reconnectTimer);
    };
  }, [noteId, currentUser?.id]);

  // Transmit cursor movement coordinates
  const sendCursorMovement = (x: number, y: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'cursor',
        payload: { cursor: { x, y } }
      }));
    }
  };

  // Transmit typing activity flag
  const sendTypingStatus = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { isTyping }
      }));
    }
  };

  // Transmit text content changes
  const sendNoteEdit = (content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'note_edit',
        payload: { content }
      }));
    }
  };

  const sendChatMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        payload: { text }
      }));
    }
  };

  return {
    presenceUsers,
    remoteCursors,
    typingUsers,
    isConnected,
    chatMessages,
    sendCursorMovement,
    sendTypingStatus,
    sendNoteEdit,
    sendChatMessage
  };
}
