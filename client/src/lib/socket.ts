import { io, Socket } from 'socket.io-client';

let socket: Socket | undefined;

export const getSocket = () => {
  if (!socket) {
    socket = io(); 
  }
  return socket;
};
