// socket.js
import io from 'socket.io-client';

// Change to named export
export const socket = io(`http://${window.location.hostname}:5000`);

