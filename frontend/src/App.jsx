import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDarkMode } from './components/DarkModeContext';

function App() {
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [userName, setUserName] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [greeting, setGreeting] = useState('');

  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();

  // Function to get dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour >= 5 && hour < 12) {
      return 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  };

  // useEffect to handle name storage and retrieval
  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    if (storedName) {
      setUserName(storedName);
    } else {
      setShowNamePrompt(true);
    }
  }, []);

  // useEffect to set initial greeting and update it every minute
  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreeting());
    };

    // Set initial greeting
    updateGreeting();

    // Update greeting every minute
    const interval = setInterval(updateGreeting, 60000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      localStorage.setItem('userName', nameInput.trim());
      setUserName(nameInput.trim());
      setShowNamePrompt(false);
    } else {
      showMessage('Please enter a name.', 'error');
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000); // Hide after 5 seconds
  };

  const handleRedirect = async () => {
    if (!location.trim()) return;

    try {
      setLoading(true);

      const response = await fetch('http://192.168.1.3:5000/save-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('savedLocation', JSON.stringify({
          name: data.data.name,
          lat: data.data.latitude,
          lng: data.data.longitude
        }));

        navigate('/core');
      } else {
        showMessage(data.error || 'Something went wrong', 'error');
      }
    } catch (error) {
      console.error(error);
      showMessage('Failed to save location. Check your backend.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your browser.', 'error');
      return;
    }

    setDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch('http://192.168.1.3:5000/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          const data = await response.json();

          if (response.ok) {
            setLocation(data.address);
          } else {
            showMessage(data.error || 'Failed to get address', 'error');
          }
        } catch (error) {
          console.error(error);
          showMessage('Failed to detect location. Please try again.', 'error');
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error(error);
        setDetecting(false);
        showMessage('Unable to retrieve your location. Please check your browser permissions.', 'error');
      }
    );
  };

  return (
    <div className={`flex w-full min-h-screen items-center justify-center p-4 transition-colors duration-500 ease-in-out ${
      isDarkMode ? 'bg-[#1b253a]' : 'bg-[#009688]'
    }`}>
      {/* Message Box */}
      {message.text && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg text-white ${message.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {message.text}
        </div>
      )}

      {/* Name Prompt Modal */}
      {showNamePrompt && (
        <div className="fixed inset-0 bg-[#00786d] bg-opacity-50 flex items-center justify-center z-50">
          {/* Container */}
          <div className="flex flex-col items-center justify-center bg-[#008177] w-[350px] lg:w-[400px] lg:h-[400px] p-6 text-[#e0e0e0] rounded-[25px] shadow-xl">
            <img src="./ulat-ph-logo.png" alt="Ulat PH Logo" className='w-[75px] h-[75px] mb-4' />
            <p className="text-sm text-center mb-4 text-[#e0e0e0] leading-6">
              Join your neighbors in building a better community! With this app, you can easily crowdsource and track local
              issues and see how others are making a difference. Your voice helps us improve our shared spaces.
            </p>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="p-2 rounded-full mb-4 w-full text-center bg-[#00786d]"
              placeholder="What should I call you?"
            />
            <button
              onClick={handleSaveName}
              className="bg-[#00786d] text-white py-2 px-6 rounded-full hover:bg-[#009688] transition-colors cursor-pointer"
            >
              Let's go!
            </button>
          </div>
        </div>
      )}

      {/* Hero Container */}
      <div className='flex flex-col items-center justify-center w-full lg:w-[1000px]'>
        <h1 className='text-[2rem] sm:text-3xl lg:text-4xl mb-4 lg:mb-8 text-[#e0e0e0] text-center'>
          {greeting}, {userName || 'friend'}
        </h1>
        {/* Buttons and Text Area Container */}
        <div className='flex w-full lg:w-[600px] items-center justify-center'>
          {/* Detect Location Button */}
          <button
            onClick={handleDetectLocation}
            disabled={detecting}
            className={`flex items-center justify-center w-12 h-12 mr-2.5 rounded-full cursor-pointer transition shadow-[_0_2px_2px_rgba(0,0,0,0.5)] ${
              detecting
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-[#e0e0e0] hover:bg-gray-200'
            }`}
          >
            <img src='/navigation-icon.png' alt='Target Icon' className='w-6 h-6' />
          </button>
          {/* Text Area */}
          <input
            type='text'
            placeholder='Enter your location'
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className='flex w-[225px] sm:w-[350px] md:w-[350px] lg:w-[500px] h-12 bg-[#e0e0e0] rounded-full pl-4 pr-4 mr-2.5 focus:outline-none focus:ring-2 focus:ring-[#00796b] shadow-[_0_2px_2px_rgba(0,0,0,0.5)]'
          />
          {/* Submit Button */}
          <button
            onClick={handleRedirect}
            disabled={!location.trim() || loading}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition shadow-[_0_2px_2px_rgba(0,0,0,0.5)] ${
              location.trim() && !loading
                ? 'bg-[#e0e0e0] hover:bg-gray-200 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <img src='/arrow-icon.png' alt='Arrow Icon' className='w-5 h-5' />
          </button>
        </div>
        <p className='text-[#e0e0e0] text-xs mt-4 lg:mt-6 italic'>Tip: You can pin your exact location later.</p>
      </div>
    </div>
  );
}

export default App;