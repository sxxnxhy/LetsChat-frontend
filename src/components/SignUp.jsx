import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function SignUp() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(''); // For email/verification messages
  const [signupStatus, setSignupStatus] = useState(''); // For signup-related messages
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  const sendVerificationCode = () => {
    if (!email) {
      setVerificationStatus('Please enter an email first!');
      return;
    }

    setVerificationStatus('Sending verification code...');

    fetch('/api/email/verification/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `email=${encodeURIComponent(email)}`,
    })
      .then(response => {
        if (response.ok) { // Status 200
          setIsCodeSent(true);
          setVerificationStatus('Verification code sent!');
        } else if (response.status === 401) { // User already exists
          setVerificationStatus('This email is already registered.');
        } else { // Other unexpected statuses (e.g., 500)
          setVerificationStatus('Failed to send verification code. Please try again.');
        }
      })
      .catch(error => {
        setVerificationStatus('Network error. Please check your connection.');
        console.error('Network Error:', error);
      });
  };

  const resendVerificationCode = () => {
    setVerificationStatus('Resending verification code...');
    fetch('/api/email/verification/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `email=${encodeURIComponent(email)}`,
    })
      .then(response => {
        if (response.ok) {
          setVerificationStatus('Verification code resent!');
        } else if (response.status === 401) {
          setVerificationStatus('This email is already registered.');
        } else {
          setVerificationStatus('Failed to resend verification code. Please try again.');
        }
      })
      .catch(error => {
        setVerificationStatus('Network error. Please check your connection.');
        console.error('Network Error:', error);
      });
  };

  const verifyCode = () => {
    if (!verificationCode) {
      setVerificationStatus('Please enter the verification code!');
      return;
    }

    setVerificationStatus('Verifying...');

    fetch('/api/email/verification/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, code: Number(verificationCode) }),
    })
      .then(response => {
        if (response.ok) {
          setIsVerified(true);
          setVerificationStatus('Email verified successfully!');
        } else if (response.status === 400) {
          setVerificationStatus('Invalid or expired code.');
        } else {
          setVerificationStatus('Verification failed. Please try again.');
        }
      })
      .catch(error => {
        setVerificationStatus('Network error. Please check your connection.');
        console.error('Error:', error);
      });
  };

  const handleSignUp = () => {
    const nameRegex = /^[a-zA-Z가-힣\-.''][a-zA-Z가-힣\s\-.'']{0,99}$/;

    if (!isVerified) {
      setSignupStatus('Please verify your email first!');
      return;
    }

    if (password !== passwordConfirm) {
      setSignupStatus('Please check your passwords');
      return;
    }

    if (!nameRegex.test(name)) {
      setSignupStatus("Name can only include Korean/English letters, spaces, - . ' and must be under 100 characters.");
      return;
    }

    if (email && name && password) {
      setSignupStatus('Signing up...');
      fetch('/api/user/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, password: password, email: email }),
      })
        .then(response => {
          if (!response.ok) throw new Error('Sign-up failed');
          return response.json();
        })
        .then(user => {
          setSignupStatus(`Sign up completed!, ${user.name}!`);
          setTimeout(() => navigate('/login'), 1000);
        })
        .catch(error => {
          setSignupStatus('Either this email is taken or invalid email. Please check your email');
          console.error('Error:', error);
        });
    } else {
      setSignupStatus('Please check your email, name and password');
    }
  };

  return (
    <>
      <div className="container">
        <h2>Sign-up</h2>
        <div className="signup-form">
          <div className="email-section">
            <input
              type="email"
              id="email"
              placeholder="Email"
              maxLength={100}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isVerified || isCodeSent}
            />
            {!isVerified && (
              <button
                type="button"
                className="verification-btn"
                onClick={isCodeSent ? resendVerificationCode : sendVerificationCode}
              >
                {isCodeSent ? 'Resend' : 'Send Verification Code'}
              </button>
            )}
            {isCodeSent && !isVerified && (
              <>
                <input
                  type="text"
                  id="verificationCode"
                  placeholder="Verification Code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                <button
                  type="button"
                  className="verification-btn"
                  onClick={verifyCode}
                >
                  Verify
                </button>
              </>
            )}
            {verificationStatus && (
              <p
                className={`verification-status ${
                  verificationStatus.includes('successfully') || verificationStatus.includes('sent') || verificationStatus.includes('resent')
                    ? 'success'
                    : verificationStatus.includes('failed') || verificationStatus.includes('Invalid') || verificationStatus.includes('error') || verificationStatus.includes('Please') || verificationStatus.includes('already')
                    ? 'error'
                    : ''
                }`}
              >
                {verificationStatus}
              </p>
            )}
          </div>

          <br />

          <input
            type="text"
            id="name"
            placeholder="Name"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="footer">
            The name you enter will be displayed as your name in the chat.<br/><br/>
            입력한 이름은 채팅방에서 이름으로 표시됩니다. 한글도 사용 가능합니다.
          </p>
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
          {signupStatus && (
            <p
              id="signupStatus"
              className={`verification-status ${
                signupStatus.includes('completed')
                  ? 'success'
                  : signupStatus.includes('Please') || signupStatus.includes('taken') || signupStatus.includes('invalid') || signupStatus.includes('Name')
                  ? 'error'
                  : ''
              }`}
            >
              {signupStatus}
            </p>
          )}
          <button onClick={handleSignUp}>Register</button>
        </div>
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
    </>
  );
}

export default SignUp;