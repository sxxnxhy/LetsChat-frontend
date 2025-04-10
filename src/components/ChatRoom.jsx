import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import MessageInput from './MessageInput'; // Import the new component
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRightFromBracket, faUserPlus, faEnvelope, faBars, faAngleLeft } from '@fortawesome/free-solid-svg-icons';



function ChatRoom() {
  const [searchParams] = useSearchParams();
  const chatRoomId = searchParams.get('chatRoomId');
  const [messages, setMessages] = useState([]);
  const [userList, setUserList] = useState([]);
  const [chatRoomName, setChatRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const isActiveRef = useRef(isActive); //a ref to track isActive
  const [unreadCount, setUnreadCount] = useState(0);
  const originalTitleRef = useRef(document.title);
  const [isNotificationSent, setIsNotificationSent] = useState(false);
  const [isNotificationSending, setisNotificationSending] = useState(false);
  const stompClientRef = useRef(null);
  const messagesDivRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }
    if (!chatRoomId) {
      navigate('/chat-list');
      return;
    }

    loadChatHistory(0);

    const stompClient = new Client({
      brokerURL: "/websocket",
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

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setUserInactive();
      } else {
        setUserActive();
      }
    };
    const handleFocus = () => setUserActive();
    const handleBlur = () => setUserInactive();

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
            requestAnimationFrame(() => scrollToBottom());
          });
        } else {
          const messagesDiv = messagesDivRef.current;
          const previousScrollHeight = messagesDiv.scrollHeight;
          const previousScrollTop = messagesDiv.scrollTop;

          setMessages(prev => [...newMessages, ...prev]);

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const newScrollHeight = messagesDiv.scrollHeight;
              messagesDiv.scrollTop = previousScrollTop + (newScrollHeight - previousScrollHeight);
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
    if (messagesDiv) messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const handleScroll = () => {
    if (messagesDivRef.current.scrollTop === 0 && currentPage + 1 < totalPages && !isLoading) {
      setCurrentPage(prev => prev + 1);
      loadChatHistory(currentPage + 1);
    }
  };

  const sendMessage = (content) => {
    if (!isLoading && content.trim()) {
      stompClientRef.current.publish({
        destination: '/app/private-message',
        body: JSON.stringify({ chatRoomId, senderId: localStorage.getItem('userId'), content }),
      });
    }
  };

  const handleSubjectChange = (msgData) => {
    if (msgData.senderName) setChatRoomName(msgData.senderName);
    setMessages(prev => [...prev, { type: 'system', content: msgData.content, enrolledAt: msgData.enrolledAt }]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom());
    });
    if (msgData.content.endsWith('나갔습니다')) {
      const username = msgData.content.replace(/"(.+)"님이 채팅에서 나갔습니다/, '$1'); 
      setUserList(prev => prev.filter(user => user.name !== username));
    }
    if (/^".+" 님이 ".+" 님을 추가했습니다$/.test(msgData.content)) {
      const username = msgData.content.replace(/^".+" 님이 "(.+)" 님을 추가했습니다$/, '$1');
      setUserList(prev => [...prev, { name: username }]); 
    }
  };

  const handleUserMessage = (msgData) => {
    setMessages(prev => [...prev, { type: 'user', ...msgData }]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToBottom());
    });
    if (isActiveRef.current == false) {
      setUnreadCount(prev => {
        const newCount = prev + 1;
        document.title = newCount > 0 ? `(${newCount}) ${originalTitleRef.current}` : originalTitleRef.current;
        return newCount;
      });
    }
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

  const cancelEditSubject = () => setIsEditingSubject(false);

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
    setUnreadCount(0); // Reset unread count
    document.title = originalTitleRef.current; // Restore original title
  };

  const handleLeaveChat = async () => {
    const confirmLeave = window.confirm("정말 채팅방을 나가시겠습니까?");
    if (!confirmLeave) return;
  
    try {
      const response = await fetch(`/api/chat-room-user/leave-chat?chatRoomId=${chatRoomId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        navigate('/chat-list');
      } else {
        console.error("Failed to leave chat");
      }
    } catch (error) {
      console.error("Error leaving chat:", error);
    }
  };
  const handleSendNotification = async () => {
    const confirmLeave = window.confirm("채팅의 모든 대화상대에게 알림 이메일을 보내시겠습니까?\n\n(Are you sure you want to send a notification email to all users in this chat?)");
    if (!confirmLeave) return;

    setisNotificationSending(true);

    try {
      const response = await fetch(`/api/email/notification/send?chatRoomId=${chatRoomId}`, {
        method: "POST"
      });
      if (response.ok) {
        setIsNotificationSent(true);
        setisNotificationSending(false);
      } else {
        window.alert("이메일 전송 실패. 잠시 후 다시 시도해주세요.");
        setisNotificationSending(false);
      }
    } catch (error) {
      console.error("Error sending the notifications:", error);
    }
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
          <a href="/chat-list"><FontAwesomeIcon icon={faAngleLeft} /> 뒤로가기</a>
          <button onClick={() => setIsSidebarOpen(true)} className="hamburger-icon"><FontAwesomeIcon icon={faBars} /></button>
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
      <MessageInput sendMessage={sendMessage} />
      <div className={`user-list-sidebar ${isSidebarOpen ? 'active' : ''}`}>
      <div className="sidebar-header">
        <h3>대화상대 <span className="user-count">({userList.length})</span></h3>
        <button onClick={() => setIsSidebarOpen(false)} className="hamburger-icon"><FontAwesomeIcon icon={faBars} /></button>
      </div>
      <ul>
        {userList.map(user => (
          <li key={user.userId}>
            <span>
              {user.userId == localStorage.getItem('userId') ? `${user.name} (You)` : user.name}
            </span>
            <p className="user-action">{user.email}</p>
          </li>
        ))}

        <div className="sidebar-footer">
          <br />
          <div className='chat-actions'>
            <button onClick={() => navigate(`/add-user-to-chat?chatRoomId=${chatRoomId}`)} className="add-user-button">
              <FontAwesomeIcon icon={faUserPlus} /> 초대하기 
            </button>
            <button onClick={handleLeaveChat} className='cancel-button'>
              나가기 &nbsp;&nbsp;&nbsp;&nbsp;
            <FontAwesomeIcon icon={faArrowRightFromBracket} />
            </button>
          </div>
          <p className="footer">Tip 💡</p>
          <p className="footer">채팅방 이름을 탭하여 변경할 수 있습니다.</p>
          <p className="footer">Tap the chat name to rename it.</p>
          <br />
          <button
            className='verification-btn'
            onClick={handleSendNotification}
            style={{ display: 'block', margin: '20px auto' }}
            disabled={isNotificationSending || isNotificationSent}
          >
            <FontAwesomeIcon icon={faEnvelope} /> &nbsp;
            {isNotificationSent ? '완료!' : '이메일 알림 보내기'}
          </button>
          <p className="footer">{isNotificationSending ? 'Sending...' : '채팅방에 있는 유저 모두에게 이메일 알림을 보냅니다'}</p>
          <br/>
        </div>
      </ul>
    </div>

  </div>
  );
}

export default ChatRoom;