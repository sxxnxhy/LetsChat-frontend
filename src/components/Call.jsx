import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faArrowLeftLong, faPhone } from '@fortawesome/free-solid-svg-icons';

function Call() {
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [targetUserName, setTargetUserName] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const targetUserIdRef = useRef(null);
  const navigate = useNavigate();
  const stompClientRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const userId = localStorage.getItem('uid');
  const iceCandidateBuffer = useRef([]);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    const stompClient = new Client({
      brokerURL: '/websocket',
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('STOMP for detecting call Connected');
        stompClient.subscribe(`/queue/call/incoming/${userId}`, (message) => {
          try {
            const notification = JSON.parse(message.body);
            console.log('Incoming call:', notification);
            targetUserIdRef.current = 0;
            setIncomingCall(notification);
            setTargetUserName(notification.name)
          } catch (error) {
            console.error('Error parsing incoming call:', error);
          }
        });
        stompClient.subscribe(`/queue/call/accepted/${userId}`, (message) => {
          try {
            const notification = JSON.parse(message.body);
            console.log('Call accepted by:', notification);
            handleCallAccepted(notification);
          } catch (error) {
            console.error('Error parsing call accepted:', error);
          }
        });
        stompClient.subscribe(`/queue/call/rejected/${userId}`, (message) => {
          console.log('Call rejected');
          setTargetUserId(null);
          setIncomingCall(null);
          alert('상대방이 통화를 거절했습니다.');
          window.location.href = '/call';
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
        stompClient.subscribe(`/queue/call/answer/${userId}`, (message) => {
          try {
            const signal = JSON.parse(message.body);
            console.log('Received answer:', signal);
            handleAnswer(signal);
          } catch (error) {
            console.error('Error parsing answer:', error);
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
          if (targetUserIdRef.current === signal.targetUserId) {
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
          else if (targetUserIdRef.current == 0) {
            try {
              console.log('Hangup from:', signal);
              setIncomingCall(null);
              setTargetUserName(null)
              targetUserIdRef.current = null;
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




  const initiateCall = async (targetId, name) => {
    if (targetUserId !== null) return;
    const hasPermission = await requestMediaPermissions();
    if (!hasPermission) {
      alert('통화를 위해 마이크 권한을 확인해주세요.');
      return;
    }
    setTargetUserId(targetId);
    setTargetUserName(name);
    targetUserIdRef.current = targetId;
    const payload = { targetUserId: targetId.toString(), userId: userId };
    console.log('Initiating call:', payload);
    stompClientRef.current.publish({
      destination: '/app/call/initiate',
      body: JSON.stringify(payload),
    });
  };

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

  const handleCallAccepted = (notification) => {
    console.log('Call accepted by user:', notification.userId);
    setTargetUserId(notification.userId);
    targetUserIdRef.current = notification.userId;
    startCallAsCaller();
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

  const startCallAsCaller = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudioRef.current.srcObject = stream;
      const pc = createPeerConnection();
      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('Offer SDP:', offer.sdp);
      const payload = {
        targetUserId: targetUserIdRef.current,
        sdp: offer,
      };
      console.log('Sending offer:', payload);
      stompClientRef.current.publish({
        destination: '/app/call/offer',
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error starting call:', error);
      alert('통화 실패. 마이크 권한을 확인해주세요.');
      hangupCall();
    }
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
            // alert('통화가 종료되었습니다.');
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

  const handleAnswer = async (signal) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('Answer applied');
        sendBufferedIceCandidates();
      } else {
        console.error('Invalid signaling state:', pc.signalingState);
      }
    } catch (error) {
      console.error('Error handling answer:', error);
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
    alert("통화 종료. 채팅 목록으로 이동합니다.");
    window.location.href = '/chat-list';
  };

  const searchUser = () => {
    if (targetUserId !== null) return;
    const trimmed = searchInput.trim();
    if (trimmed && trimmed !== '%') {
      fetch(`/api/user/search?keyword=${encodeURIComponent(trimmed)}`)
        .then((response) => {
          if (!response.ok) throw new Error('Failed to search');
          return response.json();
        })
        .then((data) => setUsers(data))
        .catch((error) => {
          console.error('Search error:', error);
          setUsers([]);
        });
    } else {
      setUsers([]);
    }
  };

  const handleKeyUp = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchUser();
    }
  };

  return (
    <>
      <div className="container">
        <h2>보이스채팅 <FontAwesomeIcon icon={faPhone} style={{ fontSize: '20px' }} />
        </h2>
        <div className="search-bar">
          <input
            type="text"
            id="userSearch"
            placeholder="검색할 이름을 입력해주세요"
            maxLength="255"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyUp={handleKeyUp}
          />
          <button onClick={searchUser}>
            <FontAwesomeIcon icon={faMagnifyingGlass} />
          </button>
        </div>
        <div className="user-divider"></div>
        <div id="userResults">
          {users.length === 0 ? (
            <div>
                <br />
                <p className="signup-prompt" style={{ textAlign: 'center' }}>전화를 받거나 걸 수 있는 공간입니다!</p>
                <br />
                <p className="signup-prompt" style={{ textAlign: 'center' }}>전화하고싶은 상대를 검색해보세요!</p>
            </div>
          ) : (
            users.map((user) => {
              if (user.userId === parseInt(userId)) {
                return (
                  <div className="user-result-item" key={user.userId}>
                    <span className="user-name">{user.name}</span>
                    <p className="user-action">본인입니다.</p>
                    <div className="user-divider"></div>
                  </div>
                );
              }
              return (
                <div className="user-result-item" key={user.userId}>
                  <span className="user-name">
                    {user.name}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        initiateCall(user.userId, user.name);
                      }}
                      className="chat-link"
                    >
                      <FontAwesomeIcon icon={faPhone} style={{ fontSize: '20px', color: '#3b83fa' }} />
                    </a>
                  </span>
                  <p className="user-action">{user.email}</p>
                  <div className="user-divider"></div>
                </div>
              );
            })
          )}
        </div>
        <button
            onClick={() => {
                if (targetUserId !== null) return;
                navigate('/chat-list');
            }}
            className="white-btn"
        >
          <FontAwesomeIcon icon={faArrowLeftLong} /> 뒤로가기
        </button>
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

export default Call;