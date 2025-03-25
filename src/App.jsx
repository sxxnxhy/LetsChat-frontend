import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './components/Index';
import Login from './components/Login';
import ChatList from './components/ChatList';
import FindUser from './components/FindUser';
import ChatRoom from './components/ChatRoom';
import AddUserToChat from './components/AddUserToChat';
import SignUp from './components/SignUp';

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
      </Routes>
    </Router>
  );
}

export default App;