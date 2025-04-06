import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function FindUser() {
  const [searchInput, setSearchInput] = useState('');
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login');
      return;
    }
  }, []);

  const searchUser = () => {
    if (searchInput) {
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
          setTimeout(() => navigate('/login'), 2000);
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
        navigate(`/chat-room?chatRoomId=${data.chatRoomId}`);
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
        <h2>Search a User</h2>
        <div className="search-bar">
          <input
            type="text"
            id="userSearch"
            placeholder="Search for a user..."
            maxLength="255"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyUp={handleKeyUp}
          />
          <button onClick={searchUser}>Search</button>
        </div>
        <div id="userResults">
          {users.length === 0 ? (
            <p>Please enter a username to search.</p>
          ) : (
            users.map(user => {
              if (user.userId === parseInt(localStorage.getItem('userId'))) {
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
                        Start new chat
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
        <button onClick={() => navigate('/chat-list')}>Back to Chats</button>
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
    </>
  );
}

export default FindUser;