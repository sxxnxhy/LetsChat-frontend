import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faComment, faPlus, faGear, faPhone } from '@fortawesome/free-solid-svg-icons';

function ChatList() {
  const [chats, setChats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0); // Track unread messages
  const originalTitleRef = useRef(document.title); // Store the original title
  const [email, setEmail] = useState([]);
  const [name, setName] = useState([]);
  const navigate = useNavigate();


  const [incomingCall, setIncomingCall] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetUserName, setTargetUserName] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const targetUserIdRef = useRef(null);
  const stompClientRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const userId = localStorage.getItem('uid');
  const iceCandidateBuffer = useRef([]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const stompClient = new Client({
      brokerURL: '/websocket',
      onConnect: () => {
        console.log('STOMP Connected');
        stompClient.subscribe(`/queue/call/incoming/${userId}`, (message) => {
          try {
            const notification = JSON.parse(message.body);
            console.log('Incoming call:', notification);
            setIncomingCall(notification);
            setTargetUserName(notification.name)
          } catch (error) {
            console.error('Error parsing incoming call:', error);
          }
        });
        stompClient.subscribe(`/queue/call/offer/${userId}`, (message) => {
          try {
            const signal = JSON.parse(message.body);
            console.log('Received offer:', signal);
            handleOffer(signal);
          } catch (error) {
            console.error('Error parsing offer:', error);
          }
        });
        stompClient.subscribe(`/queue/call/ice-candidate/${userId}`, (message) => {
          try {
            const signal = JSON.parse(message.body);
            console.log('Received ICE candidate:', signal);
            handleIceCandidate(signal);
          } catch (error) {
            console.error('Error parsing ICE candidate:', error);
          }
        });
        stompClient.subscribe(`/queue/call/hangup/${userId}`, (message) => {
          const signal = JSON.parse(message.body);
          if (targetUserIdRef.current == signal.targetUserId) {
            try {
              console.log('Hangup from:', signal);
              setIncomingCall(null);
              setTargetUserName(null)
              targetUserIdRef.current = null;
              hangupCall();
            } catch (error) {
              console.error('Error hanging up call:', error);
            }
          }
        });
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame);
      },
      onWebSocketError: (error) => {
        console.error('WebSocket Error:', error);
      },
    });

    stompClient.activate();
    stompClientRef.current = stompClient;

    return () => {
    //   hangupCall();
      stompClient.deactivate();
    };
  }, [navigate, userId]);

  const acceptCall = async () => {
    if (!incomingCall) return;
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) {
      alert('통화를 위해 마이크 권한을 확인해주세요.');
      return;
    }
    setTargetUserId(incomingCall.userId);
    targetUserIdRef.current = incomingCall.userId;
    const payload = { targetUserId: incomingCall.userId, userId: userId };
    console.log('Accepting call:', payload);
    stompClientRef.current.publish({
      destination: '/app/call/accept',
      body: JSON.stringify(payload),
    });
    startCallAsCallee();
    setIncomingCall(null);
  };

  const requestMediaPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  };

  const rejectCall = () => {
    if (!incomingCall) return;
    const payload = { targetUserId: incomingCall.userId, userId: userId };
    console.log('Rejecting call:', payload);
    stompClientRef.current.publish({
      destination: '/app/call/reject',
      body: JSON.stringify(payload),
    });
    setIncomingCall(null);
  };

  const startCallAsCallee = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudioRef.current.srcObject = stream;
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (error) {
      console.error('Error starting call:', error);
      alert('통화 실패. 마이크 권한을 확인해주세요.');
      hangupCall();
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: ['turn:syoo.shop', 'turns:syoo.shop'],
            username: 'syoo',
            credential: 'shop'
        }
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && targetUserIdRef.current) {
        console.log('Generated ICE candidate:', event.candidate);
        iceCandidateBuffer.current.push(event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      console.log('Received remote stream:', event.streams[0]);
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
        remoteAudioRef.current.play().catch((error) => {
          console.error('Autoplay error:', error);
        });
      }
    };
    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
        console.log('ICE Connection State:', pc.iceConnectionState);
        setConnectionStatus(pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            console.log('WebRTC connection established!');
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            console.error('Connection failed or disconnected');
            hangupCall();
        }
    };

    //  Monitor connection state for additional confirmation
    pc.onconnectionstatechange = () => {
        console.log('Connection State:', pc.connectionState);
        if (pc.connectionState === 'connected') {
            console.log('Full WebRTC connection (ICE + DTLS) established!');
        }
    };
    return pc;
  };

  const handleOffer = async (signal) => {
    try {
      await startCallAsCallee();
      const pc = peerConnectionRef.current;
      if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('Offer applied');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('Answer SDP:', answer.sdp);
        const payload = {
          targetUserId: targetUserIdRef.current,
          sdp: answer,
        };
        console.log('Sending answer:', payload);
        stompClientRef.current.publish({
          destination: '/app/call/answer',
          body: JSON.stringify(payload),
        });
        sendBufferedIceCandidates();
      } else {
        console.error('Invalid signaling state:', pc.signalingState);
      }
    } catch (error) {
      console.error('Error handling offer:', error);
      hangupCall();
    }
  };

  const sendBufferedIceCandidates = () => {
    setTimeout(() => {
      if (targetUserIdRef.current && iceCandidateBuffer.current.length > 0) {
        iceCandidateBuffer.current.forEach((candidate) => {
          const payload = {
            targetUserId: targetUserIdRef.current,
            candidate,
          };
          console.log('Sending ICE candidate:', payload);
          stompClientRef.current.publish({
            destination: '/app/call/ice-candidate',
            body: JSON.stringify(payload),
          });
        });
        iceCandidateBuffer.current = [];
      }
    }, 500);
  };

  const handleIceCandidate = async (signal) => {
    try {
      const pc = peerConnectionRef.current;
      if (signal.candidate && pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        console.log('ICE candidate applied');
      } else {
        console.warn('Skipping ICE candidate: PeerConnection or remoteDescription not ready');
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };
  
  useEffect(() => {
    if (connectionStatus == 'disconnected') {
      setSeconds(0); // reset when disconnected
      return;
    }
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval); // cleanup on disconnect or unmount
  }, [connectionStatus]);

  const formatTime = (totalSeconds) => {
    const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const hangupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localAudioRef.current?.srcObject) {
      localAudioRef.current.srcObject.getTracks().forEach((track) => track.stop());
      localAudioRef.current.srcObject = null;
    }
    if (remoteAudioRef.current?.srcObject) {
        remoteAudioRef.current.srcObject.getTracks().forEach((track) => track.stop());
        remoteAudioRef.current.srcObject = null;
      }
    const payload = { targetUserId: targetUserIdRef.current };
    console.log('Hangup call request:', payload);
      stompClientRef.current.publish({
        destination: '/app/call/hangup',
        body: JSON.stringify(payload),
      });
    iceCandidateBuffer.current = [];
    setTargetUserId(null);
    setIncomingCall(null);
    alert("통화가 종료되었습니다.");
    window.location.href = '/chat-list';
  };


  useEffect(() => {
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
          localStorage.setItem('uid', user.userId)
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
          <div className="chat-actions">
          <button className='change-button' onClick={() => navigate('/call')}>
            <span>
            <FontAwesomeIcon icon={faPhone} style={{ fontSize: '20px' }} />
            </span>
          </button>
          &nbsp;
          <button onClick={() => navigate('/find-user')}>
            <span>
            <FontAwesomeIcon icon={faComment} style={{ fontSize: '20px' }} />
            </span>&nbsp;
            <span>
             <FontAwesomeIcon icon={faPlus} style={{ fontSize: '16px' }}/>
             </span>
          </button>
          </div>
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
          <p className="small" title={name} style={{color: "#0862f9",maxWidth: "60%",whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",}}>사용자 이름: <span style={{ color: "#777"}}>{name} </span></p>
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

      {incomingCall && (
        <div className="call-backdrop">
            <div className="incoming-call">
                <div className="call-header">
                    <h3>수신전화</h3>
                    <h2>{incomingCall.name}</h2>
                </div>
                <div className="call-actions">
                    <button onClick={acceptCall} className="accept-button">
                    수락
                    </button>
                    <button onClick={rejectCall} className="reject-button">
                    거절
                    </button>
                </div>
            </div>
        </div>
      )}

      {targetUserId && (
        <div className="call-backdrop">
            <div className="in-call">
                <div className="call-header">
                    <h2>{targetUserName}</h2>
                    <div className={`status-indicator ${connectionStatus}`}>
                    {connectionStatus === 'connected' || connectionStatus === 'completed' ? (
                        <div>
                            <span>통화 중</span>
                            <p className="signup-prompt">{formatTime(seconds)}</p>
                        </div>
                    ) : (
                        <span className="connecting">
                        연결 중
                        <span className="dots">
                            <span>.</span><span>.</span><span>.</span>
                        </span>
                        </span>
                    )}
                    </div>
                </div>
                <div className="call-actions">
                    <button onClick={hangupCall} className="hangup-button">
                    통화 종료
                    </button>
                </div>
            </div>
        </div>
      )}

      <audio ref={localAudioRef} autoPlay muted playsInline />
      <audio ref={remoteAudioRef} autoPlay playsInline />

    </>
  );
}

export default ChatList;