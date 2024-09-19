import React, { useState, useEffect, useRef } from 'react';
import { Send, Link, X, File, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onChildAdded, remove } from 'firebase/database';

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const ChatRoom = ({ isHost = true, roomId = null }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showCopiedAlert, setShowCopiedAlert] = useState(false);
  const messagesEndRef = useRef(null);
  const [currentRoomId, setCurrentRoomId] = useState(roomId || Math.random().toString(36).substring(2, 8));

  useEffect(() => {
    const messagesRef = ref(database, `rooms/${currentRoomId}/messages`);
    const unsubscribe = onChildAdded(messagesRef, (snapshot) => {
      const message = snapshot.val();
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => unsubscribe();
  }, [currentRoomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (inputMessage.trim()) {
      const messagesRef = ref(database, `rooms/${currentRoomId}/messages`);
      push(messagesRef, {
        text: inputMessage,
        isHost,
        timestamp: new Date().toISOString(),
      });
      setInputMessage('');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const messagesRef = ref(database, `rooms/${currentRoomId}/messages`);
      push(messagesRef, {
        text: `ไฟล์ถูกอัพโหลด: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        isHost,
        timestamp: new Date().toISOString(),
        isFile: true,
      });
    }
  };

  const copyRoomLink = () => {
    const roomLink = `${window.location.origin}${window.location.pathname}?room=${currentRoomId}`;
    navigator.clipboard.writeText(roomLink).then(() => {
      setShowCopiedAlert(true);
      setTimeout(() => setShowCopiedAlert(false), 3000);
    });
  };

  const leaveRoom = () => {
    if (isHost) {
      remove(ref(database, `rooms/${currentRoomId}`));
    }
    window.location.href = window.location.pathname;
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-100 p-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">{isHost ? 'หัวห้อง' : 'ผู้เข้าร่วม'}</h2>
        <div className="flex items-center space-x-2">
          {isHost && (
            <Button variant="outline" size="icon" onClick={copyRoomLink}>
              <Link className="h-4 w-4" />
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={leaveRoom}>
            <X className="h-4 w-4 mr-1" />
            {isHost ? 'ลบห้อง' : 'ออกห้อง'}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.isHost === isHost ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-2 rounded-lg ${msg.isHost === isHost ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.isFile ? (
                <div className="flex items-center">
                  <File className="h-4 w-4 mr-2" />
                  {msg.text}
                </div>
              ) : (
                msg.text
              )}
              <div className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 bg-white">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="พิมพ์ข้อความ..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <Button variant="outline" size="icon" onClick={() => document.getElementById('file-upload').click()}>
            <File className="h-4 w-4" />
          </Button>
          <Button onClick={sendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showCopiedAlert && (
        <Alert className="absolute bottom-4 right-4 bg-green-500 text-white">
          <Check className="h-4 w-4" />
          <AlertDescription>ลิงก์ห้องถูกคัดลอกแล้ว!</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ChatRoom;
