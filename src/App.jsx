import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import Index from './components/Index';
import Login from './components/Login';
import ChatList from './components/ChatList';
import FindUser from './components/FindUser';
import ChatRoom from './components/ChatRoom';
import AddUserToChat from './components/AddUserToChat';
import SignUp from './components/SignUp';
import UserSettings from './components/UserSettings'
import "./ErrorPage.css";


const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className='error-page'>
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h1 className="error-code">404</h1>
        <p className="error-message">요청하신 페이지를 찾을 수 없습니다.</p>
        <p className="error-details">
        페이지가 존재하지 않거나 이동되었을 수 있습니다. 입력하신 주소가 정확한지 확인해 주세요.
        </p>
        <a className='logout-link' onClick={() => navigate('/chat-list')} style={{cursor: 'pointer' }}>홈페이지로 돌아가기</a>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/chat-list" element={<ChatList />} />
        <Route path="/find-user" element={<FindUser />} />
        <Route path="/chat-room" element={<ChatRoom />} />
        <Route path="/add-user-to-chat" element={<AddUserToChat />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/user-settings" element={<UserSettings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;