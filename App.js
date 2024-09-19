import React from 'react';
import ChatRoom from './ChatRoom';

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get('room');
  const isHost = !roomId;

  return (
    <div className="App">
      <ChatRoom isHost={isHost} roomId={roomId} />
    </div>
  );
}

export default App;