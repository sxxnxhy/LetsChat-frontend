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
      setStatus('Logging in...');
      fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password }),
      })
        .then(response => {
          if (!response.ok) throw new Error('Login failed');
          return response.json();
        })
        .then(user => {
          setStatus(`Welcome, ${user.name}!`);
          localStorage.setItem('userId', user.userId);
          setTimeout(() => navigate('/chat-list'), 1000);
        })
        .catch(error => {
          setStatus('Invalid email or password');
          console.error('Error:', error);
        });
    } else {
      setStatus('Please enter both email and password.');
    }
  };

  const handleKeyUp = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleLogin();
    }
  };

  return (
    <>
      <div className="container">
        <h2 style={{ textAlign: 'center' }}>Welcome !</h2>
        <p className="welcome-text">Connect with friends instantly!</p>
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
          <p id="loginStatus">{status}</p>
          <button onClick={handleLogin}>Login</button>
          <p className="signup-prompt">
            New here? <a href="/sign-up">Sign up</a>
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