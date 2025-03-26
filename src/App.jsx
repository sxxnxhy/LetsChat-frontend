import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './components/Index';
import Login from './components/Login';
import ChatList from './components/ChatList';
import FindUser from './components/FindUser';
import ChatRoom from './components/ChatRoom';
import AddUserToChat from './components/AddUserToChat';
import SignUp from './components/SignUp';
import "./ErrorPage.css";


const NotFound = () => {
  return (
    <div className='error-page'>
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h1 className="error-code">404</h1>
        <p className="error-message">Oops! The page you're looking for doesn't exist.</p>
        <p className="error-details">
          It seems like you took a wrong turn. Please check the URL or go back to the homepage.
        </p>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;