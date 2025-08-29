import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDarkMode } from './components/DarkModeContext'
import { supabase } from '../utils/supabaseClient'
import { v4 as uuidv4 } from 'uuid'

function App() {
  // User Authentication
  const [passwordInput, setPasswordInput] = useState('')
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null)

  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [userName, setUserName] = useState('')
  const [showNamePrompt, setShowNamePrompt] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })
  const [greeting, setGreeting] = useState('')
  const [showLocationRestrictionModal, setShowLocationRestrictionModal] = useState(false); // State for Metro Manila restriction popup

  const navigate = useNavigate()
  const { isDarkMode } = useDarkMode()

  // Function to get dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours()
    
    if (hour >= 5 && hour < 12) {
      return 'Good morning'
    } else if (hour >= 12 && hour < 17) {
      return 'Good afternoon'
    } else {
      return 'Good evening'
    }
  }

  // useEffect to handle name storage and retrieval
  useEffect(() => {
    const storedName = localStorage.getItem('userName')
    if (storedName) {
      setUserName(storedName)
    } else {
      setShowNamePrompt(true)
    }
  }, [])

  // useEffect to set initial greeting and update it every minute
  useEffect(() => {
    const updateGreeting = () => {
      setGreeting(getGreeting())
    }

    // Set initial greeting
    updateGreeting()

    // Update greeting every minute
    const interval = setInterval(updateGreeting, 60000)

    // Cleanup interval on component unmount
    return () => clearInterval(interval)
  }, [])

  const handleSaveName = () => {
    if (nameInput.trim()) {
      localStorage.setItem('userName', nameInput.trim())
      setUserName(nameInput.trim())
      setShowNamePrompt(false)
    } else {
      showMessage('Please enter a name.', 'error')
    }
  }

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000) // Hide after 5 seconds
  }

  const handleRegister = async () => {
    if (!nameInput.trim() || !passwordInput.trim()) {
      showMessage('Please enter both name and password.', 'error')
      return
    }

    try {
      // Generate unique UUID for the new user
      const generatedUserId = uuidv4()

      // Insert user into Supabase
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            ui: generatedUserId,
            name: nameInput.trim(),
            password: passwordInput.trim(),
          },
        ])
        .select()

      if (error) {
        console.error(error)
        showMessage('Failed to register. Try again.', 'error')
        return
      }

      // Save locally for session persistence
      localStorage.setItem('userName', nameInput.trim())
      localStorage.setItem('userId', generatedUserId)
      setUserName(nameInput.trim())
      setUserId(generatedUserId)

      setShowNamePrompt(false)
      showMessage('Registration successful!', 'success')
    } catch (err) {
      console.error(err)
      showMessage('Something went wrong.', 'error')
    }
  }

   // Function to check if location is within Metro Manila
  const isWithinMetroManila = (locationName) => {
    const metroManilaKeywords = [
      'metro manila',
      'manila',
      'quezon city',
      'makati',
      'taguig',
      'pasig',
      'mandaluyong',
      'san juan',
      'marikina',
      'pasay',
      'paranaque',
      'parañaque',
      'las pinas',
      'las piñas',
      'muntinlupa',
      'caloocan',
      'malabon',
      'navotas',
      'valenzuela'
    ]

    const locationLower = locationName.toLowerCase()
    return metroManilaKeywords.some(keyword => locationLower.includes(keyword))
  }

  const handleRedirect = async () => {
    if (!location.trim()) {
        setMessage({ text: 'Please enter a location.', type: 'error' })
        return
    }

    setLoading(true)

    try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL
        
        // Step 1: Geocode the entered location string to get coordinates
        const geocodeResponse = await fetch(`${backendUrl}/geocode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ address: location }),
        })

        const geocodeResult = await geocodeResponse.json()

        if (geocodeResult.success) {
            // Step 2: Check if the location is within Metro Manila
            if (!isWithinMetroManila(geocodeResult.location_name)) {
                setShowLocationRestrictionModal(true)
                return
            }

            // Step 3: Navigate to the /core page with the geocoded coordinates
            navigate('/core', {
                state: {
                    latitude: geocodeResult.latitude,
                    longitude: geocodeResult.longitude,
                    locationName: geocodeResult.location_name,
                },
            })
        } else {
            // Handle geocoding failure
            setMessage({ text: geocodeResult.message, type: 'error' })
        }
    } catch (error) {
        console.error('Failed to geocode location:', error)
        setMessage({ text: 'Failed to find location. Please try again.', type: 'error' })
    } finally {
        setLoading(false)
    }
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      showMessage('Geolocation is not supported by your browser.', 'error')
      return
    }

    setDetecting(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const response = await fetch(import.meta.env.VITE_BACKEND_URL + '/reverse-geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          })

          const data = await response.json()

          if (response.ok) {
            setLocation(data.address)
          } else {
            showMessage(data.error || 'Failed to get address', 'error')
          }
        } catch (error) {
          console.error(error)
          showMessage('Failed to detect location. Please try again.', 'error')
        } finally {
          setDetecting(false)
        }
      },
      (error) => {
        console.error(error)
        setDetecting(false)
        showMessage('Unable to retrieve your location. Please check your browser permissions.', 'error')
      }
    )
  }

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

      {/* Metro Manila Restriction Modal */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${
          showLocationRestrictionModal ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${isDarkMode ? 'bg-black/80' : 'bg-black/50'}`}
      >
        <div
          className={`flex flex-col items-center justify-center w-[350px] lg:w-[400px] p-6 rounded-[25px] shadow-xl transition-colors duration-500 ${
            isDarkMode ? 'bg-[#1e2a44] text-[#e0e0e0]' : 'bg-[#008177] text-[#e0e0e0]'
          }`}
        >
          <img src="./ulat-ph-logo.png" alt="Ulat PH Logo" className="w-[75px] h-[75px] mb-4" />
          <h2 className="text-xl font-bold mb-4 text-center">Service Area Restriction</h2>
          <p className="text-md text-center mb-6 leading-6">
            Sorry, Ulat PH is currently only available within Metro Manila. Please enter a location within Metro Manila to continue.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLocationRestrictionModal(false)}
              className={`
                text-[#e0e0e0] py-2 px-6 rounded-full transition-colors cursor-pointer
                ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'}
                `}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>

      {/* Name Prompt Modal */}
      {showNamePrompt && (
      <div className="fixed inset-0 bg-[#00786d] bg-opacity-50 flex items-center justify-center z-50">
        <div className="flex flex-col items-center justify-center bg-[#008177] w-[350px] lg:w-[400px] lg:h-[450px] p-6 text-[#e0e0e0] rounded-[25px] shadow-xl">
          <img src="./ulat-ph-logo.png" alt="Ulat PH Logo" className='w-[75px] h-[75px] mb-4' />
          <p className="text-sm text-center mb-4 text-[#e0e0e0] leading-6">
            Join your neighbors in building a better community! Register your account to start reporting and tracking local issues.
          </p>

          {/* Name Input */}
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="p-2 rounded-full mb-4 w-full text-center bg-[#00786d] text-white placeholder-gray-300"
            placeholder="Enter your name"
          />

          {/* Password Input */}
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="p-2 rounded-full mb-4 w-full text-center bg-[#00786d] text-white placeholder-gray-300"
            placeholder="Enter your password"
          />

          <button
            onClick={handleRegister}
            className="bg-[#00786d] text-white py-2 px-6 rounded-full hover:bg-[#009688] transition-colors cursor-pointer"
          >
            Register & Continue
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
            {/* Conditional Rendering */}
            {detecting ? (
              // Loading spinner icon
              <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-[#1e1e1e]"></div>
            ) : (
              // Original navigation icon
              <img src="/navigation-icon.png" alt="Target Icon" className="w-6 h-6" />
            )}
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
            {/* Conditional Rendering */}
            {loading ? (
              // Loading spinner icon
              <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-[#1e1e1e]"></div>
            ) : (
              // Original arrow icon
              <img src="/arrow-icon.png" alt="Arrow Icon" className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className='text-[#e0e0e0] text-xs mt-4 lg:mt-6 italic'>Tip: You can pin your exact location later.</p>
      </div>
    </div>
  )
}

export default App