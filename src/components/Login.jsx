import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('userId');
  }, []);

  const handleLogin = () => {
    if (email && password) {
      setStatus('로그인 중...');
      fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      })
        .then(response => {
          if (!response.ok) throw new Error('로그인 실패');
          return response.json();
        })
        .then(user => {
          setStatus(`${user.name}님 환영합니다!`);
          localStorage.setItem('userId', user.userId);
          setTimeout(() => navigate('/chat-list'), 1000);
        })
        .catch(error => {
          setStatus('이메일 또는 비밀번호가 일치하지 않습니다');
          console.error('Error:', error);
        });
    } else {
      setStatus('이메일과 비밀번호를 다시 확인해주세요.');
    }
  };
  
  const handleGoogleLogin = () => {
    fetch('/api/oauth/google/login', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(response => {
        if (!response.ok) throw new Error('로그인 실패');
        return response.json();
      })
      .then(data => {
        window.location.href = data.url; // redirect to Kakao
      })
      .catch(error => {
        setStatus('구글 로그인 에러');
        console.error('Error:', error);
      });
  };

  const handleKakaoLogin = () => {
    fetch('/api/oauth/kakao/login', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(response => {
        if (!response.ok) throw new Error('로그인 실패');
        return response.json();
      })
      .then(data => {
        window.location.href = data.url; // redirect to Kakao
      })
      .catch(error => {
        setStatus('카카오 로그인 에러');
        console.error('Error:', error);
      });
  };

  const handleKeyUp = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLogin();
    }
  };

  return (
    <>
      <div className="login-container">
        <h2 style={{ textAlign: 'center' }}>Let's Chat !</h2>
        <p className="welcome-text">소중한 사람과의 소통을 쉽고 간편하게!</p>
        <div className="login-form">
          <input
            type="email"
            id="email"
            placeholder="Email"
            maxLength="255"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyUp={handleKeyUp}
          />
          <input
            type="password"
            id="password"
            placeholder="Password"
            maxLength="255"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={handleKeyUp}
          />
          <button onClick={handleLogin}>Login</button>
          <p id="loginStatus">{status}</p>
          <a onClick={handleGoogleLogin} className="google-login-btn">
            <img src="../../images/web_light_sq_SI@4x.png" />
          </a>
          <a onClick={handleKakaoLogin} className="kakao-login-btn">
            <img src="../../images/kakao_login_large_narrow.png" />
          </a>
          <p className="signup-prompt">
            새로운 회원이신가요? <a href="/sign-up"> 회원가입</a>
          </p>
        </div>
        <br />
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
      <p className="footer">이 프로젝트에 대한 내용은 이 링크에 정리되어 있습니다!</p>
      <p className="footer">
        <a href="https://sxxnxhy.github.io/aboutme/posts/projects/post-2">
          sxxnxhy.github.io/aboutme/posts/projects/post-2
        </a>
      </p>
    </>
  );
}

export default Login;