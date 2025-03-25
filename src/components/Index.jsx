import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId || userId === '') {
      navigate('/login');
    } else {
      navigate('/chat-list');
    }
  }, [navigate]);

  return null; // This component doesn't render anything
}

export default Index;