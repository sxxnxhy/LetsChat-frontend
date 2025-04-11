import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons';

function UserSettings() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state;
    useEffect(() => {
      if (!state) {
        navigate('/chat-list');
      }
    }, [state, navigate]);
    if (!state) return null;
  
    const [email, setEmail] = useState(state.email);
    const [name, setName] = useState(state.name);
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [updateStatus, setUpdateStatus] = useState('');

  const handleUpdate = () => {
    const nameRegex = /^[a-zA-Z가-힣\-.''][a-zA-Z가-힣\s\-.'']{0,99}$/;

    if (password !== passwordConfirm) {
      setUpdateStatus('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!nameRegex.test(name)) {
      setUpdateStatus("이름은 한글, 영어, 특수문자 - . ' 만 사용할 수 있습니다");
      return;
    }

    if (name && password) {
      setUpdateStatus('업데이트 중...');
      fetch('/api/user/info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, password: password}),
      })
        .then(response => {
          if (!response.ok) throw new Error('잠시 후 다시 시도해주세요');
          return response.json();
        })
        .then( response => {
        if (response.status === 'name') {
            setUpdateStatus('같은이름으로 업데이트 할 수 없습니다')
        }
        else {
            setUpdateStatus(`업데이트 완료!`);
            setTimeout(() => navigate('/chat-list'), 1000);
        }
        })
        .catch(error => {
          setUpdateStatus('유효하지 않은 이름 또는 비밀번호입니다.');
          console.error('Error:', error);
        });
    } else {
      setUpdateStatus('이름과 비밀번호를 확인해주세요. ');
    }
  };

  return (
    <>
      <div className="sign-up-container">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2>회원정보 수정</h2>
          <a href="/login" style={{ marginLeft: 'auto' }}>
            <FontAwesomeIcon icon={faAngleLeft} /> 뒤로가기
          </a>
        </div>
        <div className="signup-form">
          <div className="email-section">
            <input
              type="email"
              id="email"
              placeholder="이메일"
              maxLength={100}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={true}
            />
          </div>
          <br />
          <input
            type="text"
            id="name"
            placeholder="이름"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="small">
            채팅방에서 이름으로 표시됩니다. 한글도 사용 가능합니다.<br/><br/>
          </p>
          <input
            type="password"
            id="password"
            placeholder="현재 비밀번호 또는 새로운 비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            id="passwordConfirm"
            placeholder="비밀번호 확인"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          {updateStatus && (
            <p
              id="signupStatus"
              className={`verification-status ${
                updateStatus.includes('완료!') 
                  ? 'success'
                  : updateStatus.includes('이름') || updateStatus.includes('유효') || updateStatus.includes('같은') 
                  ? 'error'
                  : ''
              }`}
            >
              {updateStatus}
            </p>
          )}
          <button onClick={handleUpdate}>업데이트</button>
        </div>
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
    </>
  );
}

export default UserSettings;