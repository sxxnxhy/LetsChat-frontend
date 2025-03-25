import { useState } from 'react';

function MessageInput({ sendMessage }) {
  const [messageInput, setMessageInput] = useState('');

  const handleSend = () => {
    if (messageInput.trim()) {
      sendMessage(messageInput);
      setMessageInput(''); 
    }
  };

  return (
    <div className="chat-input">
      <input
        type="text"
        placeholder="Type a message..."
        maxLength="255"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onKeyUp={(e) => {
          if (e.key === 'Enter') handleSend();
        }}
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}

export default MessageInput;