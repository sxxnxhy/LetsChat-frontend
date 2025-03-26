import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';

function ChatList() {
  const [chats, setChats] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0); // Track unread messages
  const originalTitleRef = useRef(document.title); // Store the original title
  const navigate = useNavigate();

  useEffect(() => {

    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }

    loadChatList();
    const stompClient = new Client({
      brokerURL: `ws://${window.location.hostname}:8080/websocket`,
    });
    stompClient.activate();
    stompClient.onConnect = (frame) => {
      console.log('Connected for detecting incoming messages: ' + frame);
      const userId = localStorage.getItem('userId');
      stompClient.subscribe(`/topic/toggle-refresh/${userId}`, (message) => {
        const refreshSignal = JSON.parse(message.body);
        if (refreshSignal === true) {
          loadChatList();
          setUnreadCount(prev => {
            const newCount = prev + 1;
            document.title = newCount > 0 ? `(${newCount}) ${originalTitleRef.current}` : originalTitleRef.current;
            return newCount;
          });
        }
      });
    };

    return () => {
      stompClient.deactivate();
    };
  }, []);

  const loadChatList = () => {
    fetch('/api/chat-list/chats', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch chats: ' + response.status);
        return response.json();
      })
      .then(chats => {
        setChats(chats);
      })
      .catch(error => {
        console.error('Error:', error);
        setChats([]);
        navigate('/login');
      });
  };

  const logout = (event) => {
    event.preventDefault();
    fetch('/api/user/logout', { method: 'POST' })
      .then(() => navigate('/login'));
  };
  window.addEventListener('focus', () => {
    setUnreadCount(0); // Reset unread count
    document.title = originalTitleRef.current; // Restore original title
  });

  return (
    <>
      <div className="container">
        <h2>Your Chats</h2>
        <hr />
        <div id="chatList">
          {chats.length === 0 ? (
            <>
              <p className="empty-message">
                No chats yet. Find a user and start a conversation!
              </p>
              <p className="empty-message">
                아직 채팅이 없습니다. 사용자를 찾아 대화를 시작해 보세요!
              </p>
            </>
          ) : (
            chats.map(chat => {
              let timeDisplay = 'new chat';
              if (chat.lastMessageTime) {
                const messageTime = new Date(chat.lastMessageTime);
                const now = new Date();
                const diffMs = now - messageTime;
                const diffMin = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffMin < 60) {
                  timeDisplay = diffMin < 1 ? 'just now' : `${diffMin} min ago`;
                } else if (diffHours < 24) {
                  timeDisplay = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
                } else if (diffDays <= 14) {
                  timeDisplay = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
                } else {
                  timeDisplay = messageTime.toLocaleDateString('en-CA');
                }
              }

              let unreadMark = '';
              if (chat.lastMessageTime && chat.lastReadAt) {
                const lastMessageTime = new Date(chat.lastMessageTime);
                const lastReadAt = new Date(chat.lastReadAt);
                if (lastMessageTime > lastReadAt) {
                  unreadMark = <span className="unread-mark"></span>;
                }
              } else if (chat.lastMessageTime && !chat.lastReadAt) {
                unreadMark = <span className="unread-mark"></span>;
              }

              return (
                <div className="chat-list-item" key={chat.chatRoomId}>
                  <Link to={`/chat-room?chatRoomId=${chat.chatRoomId}`} className="chat-list-subject">
                    {chat.chatRoomName}
                    {unreadMark}
                  </Link>
                  <p className="chat-list-last-message">
                    <span className="chat-list-last-message-text">
                      <Link to={`/chat-room?chatRoomId=${chat.chatRoomId}`} style={{ color: 'black' }}>
                        "{chat.lastMessage || 'No messages yet'}"
                      </Link>
                    </span>
                    <span>{timeDisplay}</span>
                  </p>
                  <div className="chat-divider"></div>
                </div>
              );
            })
          )}
        </div>
        <div className="chat-actions">
          <button onClick={() => navigate('/find-user')}>Search Users</button>
          <a href="/login" onClick={logout} className="logout-link">Logout</a>
        </div>
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
    </>
  );
}

export default ChatList;