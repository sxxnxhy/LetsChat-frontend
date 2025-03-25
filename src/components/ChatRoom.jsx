import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';

function ChatRoom() {
  const [searchParams] = useSearchParams();
  const chatRoomId = searchParams.get('chatRoomId');
  const [messages, setMessages] = useState([]);
  const [userList, setUserList] = useState([]);
  const [chatRoomName, setChatRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [messageInput, setMessageInput] = useState('');
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const stompClientRef = useRef(null);
  const messagesDivRef = useRef(null);
  const navigate = useNavigate();

  console.log("랜더링됨" , isActive);

  useEffect(() => {
    if (!chatRoomId) {
      navigate('/chat-list');
      return;
    }

    loadChatHistory(0);

    const stompClient = new Client({
      brokerURL: `ws://${window.location.hostname}:8080/websocket`,
    });
    stompClient.activate();
    stompClientRef.current = stompClient;

    stompClient.onConnect = (frame) => {
      console.log('Connected: ' + frame);
      stompClient.subscribe(`/topic/private-chat/${chatRoomId}`, (message) => {
        const msgData = JSON.parse(message.body);
        if (msgData.senderId == 0 || msgData.senderId == null) {
          handleSubjectChange(msgData);
        } else {
          handleUserMessage(msgData);
        }
      });
    };
  }, [chatRoomId]);

  // New useEffect for activity detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("inactive")
        setUserInactive();
      } else {
        console.log("active")
        setUserActive();
      }
    };
    const handleFocus = () => {
      console.log("active")
      setUserActive();
    };
    const handleBlur = () => {
      console.log("inactive")
      setUserInactive();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [chatRoomId]);
  

  const loadChatHistory = (page) => {
    if (isLoading) return;
    setIsLoading(true);

    fetch(`/api/chat-room/chat-history?chatRoomId=${chatRoomId}&page=${page}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to load chat history');
        return response.json();
      })
      .then(data => {
        setTotalPages(data.totalPages);
        setChatRoomName(data.chatRoomName);
        setUserList(data.users);
        const newMessages = data.messages.map(msg => ({
          ...msg,
          type: msg.senderId === 0 || msg.senderId == null ? 'system' : 'user',
        }));
        if (page === 0) {
          setMessages(newMessages);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              scrollToBottom();
            });
          });  
        } else {

          const messagesDiv = messagesDivRef.current;
          const previousScrollHeight = messagesDiv.scrollHeight;
          const previousScrollTop = messagesDiv.scrollTop;

          setMessages(prev => [...newMessages, ...prev]);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const newScrollHeight = messagesDiv.scrollHeight;
              const heightDifference = newScrollHeight - previousScrollHeight;
              messagesDiv.scrollTop = previousScrollTop + heightDifference;
            });
          });

        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading history:', error);
        setIsLoading(false);
        navigate('/chat-list');
      });
  };

  const scrollToBottom = () => {
    const messagesDiv = messagesDivRef.current;
    if (messagesDiv) {
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  };

  const handleScroll = () => {
    if (messagesDivRef.current.scrollTop === 0 && currentPage + 1 < totalPages && !isLoading) {
      setCurrentPage(prev => prev + 1);
      loadChatHistory(currentPage + 1);
    }
  };

  const sendMessage = () => {
    if (!isLoading && messageInput.trim()) {
      stompClientRef.current.publish({
        destination: '/app/private-message',
        body: JSON.stringify({ chatRoomId, senderId: localStorage.getItem('userId'), content: messageInput }),
      });
      setMessageInput('');
    }
  };

  const handleSubjectChange = (msgData) => {
    if (msgData.senderName) setChatRoomName(msgData.senderName);
    setMessages(prev => [...prev, { type: 'system', content: msgData.content, enrolledAt: msgData.enrolledAt }]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });

  };

  const handleUserMessage = (msgData) => {
    console.log(isActive)
    setMessages(prev => [...prev, { type: 'user', ...msgData }]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    });
  };

  const toggleEditSubject = () => {
    setIsEditingSubject(true);
    setNewSubject(chatRoomName);
  };

  const saveSubject = () => {
    if (newSubject.trim()) {
      fetch('/api/chat-room/update-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatRoomId, chatRoomName: newSubject }),
      })
        .then(() => {
          setChatRoomName(newSubject);
          setIsEditingSubject(false);
        });
    }
  };

  const cancelEditSubject = () => {
    setIsEditingSubject(false);
  };

  const setUserInactive = () => {
    setIsActive(false);
    stompClientRef.current.publish({
      destination: '/app/user-inactive',
      body: JSON.stringify({ chatRoomId, userId: localStorage.getItem('userId') }),
    });
  };

  const setUserActive = () => {
    setIsActive(true);
    stompClientRef.current.publish({
      destination: '/app/user-active',
      body: JSON.stringify({ chatRoomId, userId: localStorage.getItem('userId') }),
    });
  };

  return (
    <div className="chat-container">
      <div className={`chat-header ${isEditingSubject ? 'editing' : ''}`}>
        <h2>
          {isEditingSubject ? (
            <div className="edit-subject-container">
              <input
                type="text"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="edit-subject-input"
                maxLength={50}
              />
              <button onClick={saveSubject} className="edit-subject-button change-button">O</button>
              <button onClick={cancelEditSubject} className="edit-subject-button cancel-button">X</button>
            </div>
          ) : (
            <span onClick={toggleEditSubject} style={{ cursor: 'pointer' }}>
              {chatRoomName}
            </span>
          )}
        </h2>
        <div className="header-actions">
          <a href="/chat-list">Back to Chats</a>
          <button onClick={() => setIsSidebarOpen(true)} className="hamburger-icon">☰</button>
        </div>
      </div>
      <div className="chat-messages" ref={messagesDivRef} onScroll={handleScroll}>
        {isLoading && currentPage > 0 && <div className="loading">Loading...</div>}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={msg.type === 'system' ? 'system-message' : `message ${msg.senderId == localStorage.getItem('userId') ? 'sent' : 'received'}`}
          >
            {msg.type === 'system' ? (
              <>
                <div className="system-message-bubble">{msg.content}</div>
                <div className="system-message-time">
                  {new Date(msg.enrolledAt).toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </>
            ) : (
              <>
                {msg.senderId != localStorage.getItem('userId') && <div className="sender-name">{msg.senderName}</div>}
                <div className="message-bubble">{msg.content}</div>
                <div className="message-time">
                  {new Date(msg.enrolledAt).toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Type a message..."
          maxLength="255"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyUp={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
      <div className={`user-list-sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-header">
          <h3>Members of this Chat</h3>
          <button onClick={() => setIsSidebarOpen(false)} className="hamburger-icon">☰</button>
        </div>
        <ul>
          {userList.map(user => (
            <li key={user.userId}>
              {user.userId == localStorage.getItem('userId') ? `${user.name} (You)` : user.name}
            </li>
          ))}
        </ul>
        <br />
        <button onClick={() => navigate(`/add-user-to-chat?chatRoomId=${chatRoomId}`)} className="add-user-button">
          Add User
        </button>
      </div>
    </div>
  );
}

export default ChatRoom;