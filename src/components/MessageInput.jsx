import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons';

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
        maxLength="3000"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onKeyUp={(e) => {
          if (e.key === 'Enter') handleSend();
        }}
      />
      <button onClick={handleSend}><FontAwesomeIcon icon={faPaperPlane} /></button>
    </div>
  );
}

export default MessageInput;