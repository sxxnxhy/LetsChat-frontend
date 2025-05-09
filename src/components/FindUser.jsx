import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faArrowLeftLong, faComment, faPlus } from '@fortawesome/free-solid-svg-icons';

function FindUser() {
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState([]);
  const userId = localStorage.getItem('uid');
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
  }, []);

  const searchUser = () => {
    const trimmed = searchInput.trim();
    if (trimmed && trimmed !== '%') {
    // if (searchInput) {
      fetch(`/api/user/search?keyword=${encodeURIComponent(searchInput)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to search users: ' + response.status);
          return response.json();
        })
        .then(users => {
          setUsers(users);
        })
        .catch(error => {
          console.error('Error:', error);
          setUsers([]);
          setTimeout(() => navigate('/chat-list'), 2000);
        });
    } else {
      setUsers([]);
    }
  };

  const startChat = (targetUserId, targetUserName) => {
    fetch('/api/chat-room/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, targetUserName }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to start chat');
        return response.json();
      })
      .then(data => {
        navigate(`/chat-room?cri=${data.chatRoomId}`);
      })
      .catch(error => {
        console.error('Error starting chat:', error);
        alert('Error starting chat.');
      });
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
        <h2>대화상대 검색</h2>
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
          <button onClick={searchUser}><FontAwesomeIcon icon={faMagnifyingGlass} /></button>
        </div>
        <div className="user-divider"></div>
        <div id="userResults">
          {users.length === 0 ? (
            <p className='footer'>Please enter a username to search.</p>
          ) : (
            users.map(user => {
              if (user.userId === parseInt(userId)) {
                return (
                  <div className="user-result-item" key={user.userId}>
                    <span className="user-name">{user.name}</span>
                    <p className="user-action">본인입니다.</p>
                    <div className="user-divider"></div>
                  </div>
                );
              } else {
                return (
                  <div className="user-result-item" key={user.userId}>
                    <span className="user-name">
                      {user.name}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          startChat(user.userId, user.name);
                        }}
                        className="chat-link"
                      >
                                    <span>
                                    <FontAwesomeIcon icon={faComment} style={{ fontSize: '20px', color: "#3b83fa"}} />
                                    </span>&nbsp;
                                    <span>
                                     <FontAwesomeIcon icon={faPlus} style={{ fontSize: '16px', color: "#3b83fa"}}/>
                                     </span>
                      </a>
                    </span>
                    <p className="user-action">{user.email}</p>
                    <div className="user-divider"></div>
                  </div>
                );
              }
            })
          )}
        </div>
        <button onClick={() => navigate('/chat-list')} className="white-btn"><FontAwesomeIcon icon={faArrowLeftLong} /> 뒤로가기</button>
      </div>
    </>
  );
}

export default FindUser;