import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faArrowLeftLong, faUserPlus, faUserCheck } from '@fortawesome/free-solid-svg-icons';

function AddUserToChat() {
  const [searchParams] = useSearchParams();
  const chatRoomId = searchParams.get('chatRoomId');
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
      fetch(`/api/chat-room/search?keyword=${encodeURIComponent(searchInput)}&chatRoomId=${chatRoomId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(response => {
          if (!response.ok) throw new Error('Failed to search users: ' + response.status);
          return response.json();
        })
        .then(data => {
          setUsers(
            data.allUsers.map(user => ({
              ...user,
              isInChat: data.chatRoomUsers.includes(user.userId),
            }))
          );
        })
        .catch(error => {
          console.error('Error:', error);
          setUsers([]);
        });
    } else {
      setUsers([]);
    }
  };

  const addUserToChat = (userId) => {
    fetch('/api/chat-room/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatRoomId, userId }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Failed to add user');
        return response.json();
      })
      .then(() => {
        setUsers(prev =>
          prev.map(user =>
            user.userId === userId ? { ...user, isInChat: true } : user
          )
        );
      })
      .catch(error => {
        console.error('Error adding user:', error);
        alert('Failed to add user. Please try again.');
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
        <h2>초대하기</h2>
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
          {users.map(user => (
            <div className="user-result-item" key={user.userId}>
              <span className="user-name">
                {user.name}
                {user.isInChat ? (
                  <p className="user-action"><FontAwesomeIcon icon={faUserCheck} /></p>
                ) : (
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      addUserToChat(user.userId);
                    }}
                    className="chat-link"
                  >
                    <FontAwesomeIcon icon={faUserPlus} />
                  </a>
                )}
              </span>
              <p className="user-action">{user.email}</p>
              <div className="user-divider"></div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate(`/chat-room?chatRoomId=${chatRoomId}`)}>
        <FontAwesomeIcon icon={faArrowLeftLong} /> Back to Chat
        </button>
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
    </>
  );
}

export default AddUserToChat;