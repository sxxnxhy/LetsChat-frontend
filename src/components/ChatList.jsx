import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faComment, faPlus, faGear } from '@fortawesome/free-solid-svg-icons';

function ChatList() {
  const [chats, setChats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0); // Track unread messages
  const originalTitleRef = useRef(document.title); // Store the original title
  const [email, setEmail] = useState([]);
  const [name, setName] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {

    const userId = localStorage.getItem('userId');
    if (!userId) {
      fetch('/api/user/id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to load user ID: ' + response.status);
          return response.json();
        })
        .then(user => {
          localStorage.setItem('userId', user.userId)
        })
        .catch(error => {
          console.error('Error:', error);
          setChats([]);
          navigate('/login');
        });
    }

    loadChatList();
    loadUserNameAndEmail();
    const stompClient = new Client({
      brokerURL: "/websocket",
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
  const loadUserNameAndEmail = () => {
    fetch('/api/chat-list/name-and-email', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to get: ' + response.status);
        return response.json();
      })
      .then(user => {
        setName(user.name);
        setEmail(user.email);
      })
      .catch(error => {
        console.error('Error:', error);
      });
  };

  const logout = (event) => {
    event.preventDefault();
    fetch('/api/user/logout', { method: 'POST' })
      .then(() => 
        navigate('/login')
    );
  };

  const handleSettingsClick = () => {
    navigate('/user-settings', { state: { name, email } });
  };

  window.addEventListener('focus', () => {
    setUnreadCount(0); // Reset unread count
    document.title = originalTitleRef.current; // Restore original title
  });

  return (
    <>
      <div className="container">
        <div className="chat-actions">
          <h2>채팅</h2>
          <button onClick={() => navigate('/find-user')}>
            <span>
            <FontAwesomeIcon icon={faComment} style={{ fontSize: '20px' }} />
            </span>&nbsp;
            <span>
             <FontAwesomeIcon icon={faPlus} style={{ fontSize: '16px' }}/>
             </span>
          </button>
        </div>
        <hr style={{width: "100%", border: "none", borderTop: "2px solid #ccc", margin: "0", padding: "3px", boxSizing: "border-box", height: "1px"}}/>
        
        {/* Chat list with fixed height and scrolling */}
        <div id="chatList" style={{ flex: '1', overflowY: 'auto' }}>
          {chats === null ? (
            <p className="loading">Loading...</p>
          ) : chats.length === 0 ? (
            <>
              <p className="empty-message">
                아직 채팅이 없습니다. 사용자를 찾아 대화를 시작해 보세요!
              </p>
            </>
          ) : (
            chats.map(chat => {
              let timeDisplay = '메시지 없음';
              if (chat.lastMessageTime) {
                const messageTime = new Date(chat.lastMessageTime);
                const now = new Date();
                const diffMs = now - messageTime;
                const diffMin = Math.floor(diffMs / (1000 * 60));
                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                if (diffMin < 60) {
                  timeDisplay = diffMin < 1 ? '방금' : `${diffMin}분 전`;
                } else if (diffHours < 24) {
                  timeDisplay = diffHours === 1 ? '1시간 전' : `${diffHours}시간 전`;
                } else if (diffDays <= 14) {
                  timeDisplay = diffDays === 1 ? '1일 전' : `${diffDays}일 전`;
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
                  <Link to={`/chat-room?cri=${chat.chatRoomId}`} className="chat-list-subject">
                    {chat.chatRoomName}
                    {unreadMark}
                  </Link>
                  <p className="chat-list-last-message">
                    <span className="chat-list-last-message-text">
                      <Link to={`/chat-room?cri=${chat.chatRoomId}`} style={{ color: '#777' }}>
                        {chat.lastMessage || '대화를 시작해보세요!'}
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
        <hr style={{width: "100%", border: "none", borderTop: "2px solid #ccc", margin: "0", boxSizing: "border-box", height: "1px"}}/>
        <div style={{ display: "flex", paddingTop: "18px" }}>
          <p className="small" style={{ color: "#0862f9"}}>사용자 이름: <span style={{ color: "#777"}}>{name} </span></p>
          <span style={{ marginLeft: "auto" }}>
            <a className="logout-link" style={{ color: '#0862f9', marginRight: '20px', cursor: 'pointer' }} onClick={handleSettingsClick}>
              <FontAwesomeIcon icon={faGear}/>설정
            </a>
            <a href="/login" onClick={logout} className="logout-link" >
              <FontAwesomeIcon icon={faRightFromBracket} />로그아웃
            </a>
          </span>
        </div>
      </div>
    </>
  );
}

export default ChatList;