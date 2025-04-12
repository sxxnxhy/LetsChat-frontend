import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft } from '@fortawesome/free-solid-svg-icons';


function SignUp() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(''); // For email/verification messages
  const [signupStatus, setSignupStatus] = useState(''); // For signup-related messages
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailDisabled, setIsEmailDisabled] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  const sendVerificationCode = () => {
    if (!email) {
      setVerificationStatus('이메일을 입력해주세요!');
      return;
    }
    setIsEmailDisabled(true);
    setVerificationStatus('인증번호 전송 중...');

    fetch('/api/email/verification/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `email=${encodeURIComponent(email)}`,
    })
      .then(response => {
        if (response.ok) { // Status 200
          setIsCodeSent(true);
          setVerificationStatus('인증번호 전송 완료!');
          setIsEmailDisabled(false);
        } else if (response.status === 401) { // User already exists
          setVerificationStatus('이미 존재하는 이메일입니다');
          setIsEmailDisabled(false);
        } else { // Other unexpected statuses (e.g., 500)
          setVerificationStatus('인증번호 전송에 실패하였습니다');
          setIsEmailDisabled(false);
        }
      })
      .catch(error => {
        setVerificationStatus('잠시 후 다시 시도해주세요.');
        setIsEmailDisabled(false);
        console.error('Network Error:', error);
      });
  };

  const resendVerificationCode = () => {
    setIsEmailDisabled(true);
    setVerificationStatus('인증번호 전송 중...');
    fetch('/api/email/verification/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `email=${encodeURIComponent(email)}`,
    })
      .then(response => {
        if (response.ok) {
          setVerificationStatus('인증번호 재전송 완료! 메일이 보이지 않으면 스팸함을 확인해 주세요.');
          setIsEmailDisabled(false);
        } else if (response.status === 401) {
          setVerificationStatus('이미 존재하는 이메일입니다');
          setIsEmailDisabled(false);
        } else {
          setVerificationStatus('잠시 후 다시 시도해주세요')
          setIsEmailDisabled(false);
        }
      })
      .catch(error => {
        setIsEmailDisabled(false);
        setVerificationStatus('잠시 후 다시 시도해주세요');
        console.error('Network Error:', error);
      });
  };

  const verifyCode = () => {
    if (!verificationCode) {
      setVerificationStatus('인증번호를 입력해주세요!');
      return;
    }
    setIsEmailDisabled(true);
    setVerificationStatus('인증 중...');

    fetch('/api/email/verification/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, code: Number(verificationCode) }),
    })
      .then(response => {
        if (response.ok) {
          setIsVerified(true);
          setVerificationStatus('이메일 인증이 완료되었습니다!');
          setSignupStatus('');
        } else if (response.status === 400) {
          setVerificationStatus('잘못된 인증번호 입니다');
          setIsEmailDisabled(false);
        } else {
          setVerificationStatus('잠시 후 다시 시도해주세요.');
          setIsEmailDisabled(false);
        }
      })
      .catch(error => {
        setVerificationStatus('잠시 후 다시 시도해주세요.');
        setIsEmailDisabled(false);
        console.error('Error:', error);
      });
  };

  const handleSignUp = () => {
    const nameRegex = /^[a-zA-Z가-힣\-.''][a-zA-Z가-힣\s\-.'']{0,99}$/;

    if (!isVerified) {
      setSignupStatus('이메일 인증을 완료해주세요.');
      return;
    }

    if (password !== passwordConfirm) {
      setSignupStatus('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!nameRegex.test(name)) {
      setSignupStatus("이름은 한글, 영어, 특수문자 - . ' 만 사용할 수 있습니다");
      return;
    }

    if (email && name && password) {
      setSignupStatus('회원가입 중...');
      fetch('/api/user/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, password: password, email: email }),
      })
        .then(response => {
          if (!response.ok) throw new Error('잠시 후 다시 시도해주세요');
          return response.json();
        })
        .then(user => {
          setSignupStatus(`${user.name}님 회원가입 완료!`);
          setTimeout(() => navigate('/login'), 1000);
        })
        .catch(error => {
          setSignupStatus('이미 존재하는 이메일이거나 유효하지 않은 이메일입니다.');
          console.error('Error:', error);
        });
    } else {
      setSignupStatus('이름과 비밀번호를 확인해주세요. ');
    }
  };

  return (
    <>
      <div className="sign-up-container">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2>회원가입</h2>
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
              disabled={isVerified || isCodeSent}
            />
            {!isVerified && (
              <button
                type="button"
                className="verification-btn"
                onClick={isCodeSent ? resendVerificationCode : sendVerificationCode}
                disabled={isEmailDisabled}
              >
                {isCodeSent ? '인증번호 재전송' : '인증번호 전송'}
              </button>
            )}
            {isCodeSent && !isVerified && (
              <>
                <input
                  type="text"
                  id="verificationCode"
                  placeholder="인증번호"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                <button
                  type="button"
                  className="verification-btn"
                  onClick={verifyCode}
                >
                  인증하기
                </button>
              </>
            )}
            {verificationStatus && (
              <p
                className={`verification-status ${
                  verificationStatus.includes('완료')  || verificationStatus.includes('재전송')
                    ? 'success'
                    : verificationStatus.includes('실패') || verificationStatus.includes('입력') || verificationStatus.includes('잘못') || verificationStatus.includes('다시') || verificationStatus.includes('이미')
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
            placeholder="이름"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="footer">
            채팅방에서 이름으로 표시됩니다. 한글도 사용 가능합니다.<br/><br/>
          </p>
          <input
            type="password"
            id="password"
            placeholder="비밀번호"
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
          {signupStatus && (
            <p
              id="signupStatus"
              className={`verification-status ${
                signupStatus.includes('회원가입 완료!')
                  ? 'success'
                  : signupStatus.includes('이름') || signupStatus.includes('일치') || signupStatus.includes('이메일') || signupStatus.includes('비밀번호')|| signupStatus.includes('잠시')
                  ? 'error'
                  : ''
              }`}
            >
              {signupStatus}
            </p>
          )}
          <button onClick={handleSignUp}>회원가입</button>
        </div>
      </div>
      <p className="footer">A chat service by Seunghyun Yoo.</p>
    </>
  );
}

export default SignUp;