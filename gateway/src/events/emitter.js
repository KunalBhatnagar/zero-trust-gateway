// gateway/src/events/emitter.js

let io = null;

function initEmitter(socketServer) {
  io = socketServer;
}

function emitRequest(data) {
  if (!io) return;
  io.emit('request:new', data);
}

function emitThreat(data) {
  if (!io) return;
  io.emit('threat:detected', data);
}

export { initEmitter, emitRequest, emitThreat };