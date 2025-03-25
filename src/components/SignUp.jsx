import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignUp() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  const handleSignUp = () => {
    if (password !== passwordConfirm) {
      setStatus('Please check your passwords');
      return;
    }
    if (username && password) {
      setStatus('Signing up...');
      fetch('/api/user/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: username, password }),
      })
        .then(response => {
          if (!response.ok) throw new Error('Sign-up failed');
          return response.json();
        })
        .then(user => {
          setStatus(`Sign up completed!, ${user.name}!`);
          setTimeout(() => navigate('/login'), 1000);
        })
        .catch(error => {
          setStatus('This user name is taken.');
          console.error('Error:', error);
        });
    } else {
      setStatus('Please enter both username and password.');
    }
  };

  return (
    <>
      <div className="container">
        <h2>Sign-up</h2>
        <p className="footer">The name you enter will be displayed as your username in the chat.</p>
        <p className="footer">입력한 이름은 채팅방에서 사용자 이름으로 표시됩니다. 한글도 사용 가능합니다.</p>
        <div className="login-form">
          <input
            type="text"
            id="username"
            placeholder="Enter your name"
            maxLength={100}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <br />
          <input
            type="password"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            id="passwordConfirm"
            placeholder="Confirm password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
          <p id="loginStatus">{status}</p>
          <button onClick={handleSignUp}>Register</button>
        </div>
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
    </>
  );
}

export default SignUp;