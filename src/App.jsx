import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import { useDarkMode } from './components/DarkModeContext'
import { supabase } from './utils/supabaseClient'

function App() {
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null)            // #1 - Generate and set user ID
  const [showFirstPrompt, setshowFirstPrompt] = useState(false)                           // #2 - First Prompt
  const [nameInput, setNameInput] = useState('')                                          // #3 - Input user name
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)                         // #4 - 
  const [greeting, setGreeting] = useState('')                                            // #5 - Greetings
  const [userName, setUserName] = useState('')                                            // #6 - Add user name to greeting  
  const [detecting, setDetecting] = useState(false)                                       // #7 - Detect user location
  const [location, setLocation] = useState('')                                            // #8 - Put exact location on textbox
  const [loading, setLoading] = useState(false)                                           // #9 - Initiate spinner icon
  const [showLocationRestrictionModal, setShowLocationRestrictionModal] = useState(false) // #10 - Location restriction
  const [message, setMessage] = useState({ text: '', type: '' })                          // #11 - Detect location failed
  const navigate = useNavigate()                                                          // #12 - Redirect to Core.jsx
  const { isDarkMode } = useDarkMode()                                                    // #13 - Dark mode
  const [registering, setRegistering] = useState(false)

  // ============================== First Prompt ("Join your neighbors in building...") ==============================
  useEffect(() => {
    const storedName = localStorage.getItem('userName')
    const hasSeenWelcome = localStorage.getItem('welcomeShown') === 'true'

    if (storedName) {
      setUserName(storedName)
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true)
      }
    } else {
      setshowFirstPrompt(true)
    }
  }, [])

  // ============================== Register name to database (Supabase) ==============================
  const handleRegister = async () => {
    if (!nameInput.trim()) {
      showMessage('Please enter your name.', 'error')
      return
    }

    if (registering) return // Prevent double-clicks

    setRegistering(true) // Disable button

    try {
      const generatedUserId = uuidv4()
      const { data, error } = await supabase
        .from('users')
        .insert([{ ui: generatedUserId, name: nameInput.trim() }])
        .select()

      if (error) {
        console.error(error)
        showMessage("Sorry, I didn't get that. Please try again.", 'error')
        setRegistering(false)
        return
      }

      // Save name and ID to localStorage
      localStorage.setItem('userName', nameInput.trim())
      localStorage.setItem('userId', generatedUserId)

      // Update states
      setUserName(nameInput.trim())
      setUserId(generatedUserId)

      // Hide the name prompt modal
      setshowFirstPrompt(false)

      // Show welcome modal on first visit
      const hasSeenWelcome = localStorage.getItem('welcomeShown') === 'true'
      if (!hasSeenWelcome) {
        setShowWelcomeModal(true)
        localStorage.setItem('welcomeShown', 'true')
      }
    } catch (err) {
      console.error(err)
      showMessage('Something went wrong.', 'error')
    } finally {
      setRegistering(false) // Re-enable button
    }
  }

  // ============================== Greetings ==============================
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

  useEffect(() => { 
    const updateGreeting = () => {
      setGreeting(getGreeting())
    }

    updateGreeting()

    const interval = setInterval(updateGreeting, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const showMessage = (text, type) => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }
  
  // ============================== Set cities within Metro Manila ==============================
  const isWithinMetroManila = (locationName) => {
    const metroManilaKeywords = [
      'metro manila', 'manila', 'quezon city', 'makati', 'taguig',
      'pasig', 'mandaluyong', 'san juan', 'marikina', 'pasay',
      'paranaque', 'parañaque', 'las pinas', 'las piñas', 'muntinlupa',
      'caloocan', 'malabon', 'navotas', 'valenzuela'
    ]

    const locationLower = locationName.toLowerCase()
    return metroManilaKeywords.some(keyword => locationLower.includes(keyword))
  }

  // ============================== Detect user's current location ==============================
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
            // Fallback to coordinates if geocoding fails
            if (response.status === 503) {
              setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
              showMessage('Location detected but address lookup failed. Using coordinates.', 'warning')
            } else {
              showMessage(data.error || 'Failed to get address', 'error')
            }
          }
        } catch (error) {
          console.error(error)
          // Fallback to coordinates
          setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
          showMessage('Network error. Using coordinates instead of address.', 'warning')
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

  // ============================== Redirect to Core.jsx if location if valid (within Metro Manila) ==============================
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

  // ============================== Start of UI ==============================
  return (
    <div
      className={`
        flex w-full min-h-screen items-center justify-center p-4 transition-colors duration-500 ease-in-out
        ${isDarkMode ? 'bg-[#121212]' : 'bg-[#009688]'}`
      }
    >

      {/* First Prompt Modal */}
      {showFirstPrompt && (
        <div className="fixed inset-0 bg-[#00786d] bg-opacity-50 flex items-center justify-center z-50">

          {/* First Greeting Container */}
          <div
            className="
              flex flex-col items-center justify-center bg-[#008177]
              w-[350px] lg:w-[350px] lg:h-[350px] p-6 text-[#e0e0e0]
              rounded-[25px] shadow-xl
            "
          >

            {/* Ulat PH Logo */}
            <img src="./ulat-ph-logo.png" alt="Ulat PH Logo" className='w-[75px] h-[75px] mb-4' />

            {/* First Greeting */}
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

            {/* Let's Go! Button */}
            <button
              onClick={handleRegister}
              disabled={registering}
              className="bg-[#00786d] text-white py-2 px-6 rounded-full hover:bg-[#009688] transition-colors cursor-pointer"
            >
              Let's Go!
            </button>

          </div>
        </div>
      )}

      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-[#00786d] bg-opacity-50 flex items-center justify-center z-50">
          
          {/* Modal Container */}
          <div className="flex flex-col items-center justify-center bg-[#008177] w-[350px] lg:w-[600px] lg:h-[500px] p-6 text-[#e0e0e0] rounded-[25px] shadow-xl">
            
            {/* Ulat PH Logo */}
            <img src="./ulat-ph-logo.png" alt="Ulat PH Logo" className="w-[75px] h-[75px] mb-4" />

            {/* Title */}
            <h1 className="text-2xl font-bold text-center mb-4 leading-7">
              Welcome to Ulat PH!
            </h1>

            {/* Introduction */}
            <p className="text-base text-center mb-4 leading-6 max-w-[500px]">
              Ulat PH is a community-driven reporting web app that enables people in your
              community to crowdsource and track local issues. You can see reports within
              <span className="font-semibold"> 1 km</span> of your location, interact with
              them, and even post your own reports!
              <br /><br />
              Ready to contribute to the community?
            </p>

            {/* Yes Button */}
            <button
              onClick={() => setShowWelcomeModal(false)}
              className="bg-[#00786d] text-white py-2 px-6 mb-4 rounded-full hover:bg-[#009688] transition-colors cursor-pointer"
            >
              Yes!
            </button>

            {/* Bottom Part */}
            <div className="text-center space-y-1">

              {/* iOS Users Notice */}
              <span className="text-xs block font-bold">
                For iOS users, you may need to enable location permissions.
              </span>

              {/* Directions */}
              <span className="text-[0.65rem] block mb-4">
                Settings → Privacy & Security → Location Services → Safari Websites →
                While Using the App
              </span>
              
              {/* Links */}
              <div className="flex items-center justify-center mb-2 gap-2">

                {/* GitHub */}
                <a href="https://github.com/vnclrd" target="_blank" rel="noopener noreferrer">
                  <img src="/github-logo.png" alt="GitHub Icon" className="w-4 h-4 filter invert" />
                </a>

                {/* LinkedIn */}
                <a href="https://www.linkedin.com/in/vnclrd/" target="_blank" rel="noopener noreferrer">
                  <img src="/linkedin-logo.png" alt="LinkedIn Icon" className="w-4 h-4 filter invert" />
                </a>

                {/* Portfolio Website */}
                <a href="https://vnclrd.github.io/miguel-portfolio/" target="_blank" rel="noopener noreferrer">
                  <img src="/portfolio-website-icon.png" alt="Portfolio Website" className="w-4 h-4 filter invert" />
                </a>

              </div>

              {/* Developed by */}
              <span className="text-[0.65rem] block">
                Developed by Miguel Ivan Calarde
              </span>

            </div>
          </div>
        </div>
      )}

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

      {/* Hero Container */}
      <div className='flex flex-col items-center justify-center w-full lg:w-[1000px]'>

        {/* Greeting (Good morning, Good afternoon, Good evening) */}
        <h1 className='text-[2rem] sm:text-3xl lg:text-4xl mb-4 lg:mb-8 text-[#e0e0e0] text-center'>
          {greeting}, <span className='font-bold'>{userName || 'neighbor'}</span>!
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

            {/* Spinner icon when loading */}
            {detecting ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-[#1e1e1e]"></div> // Loading spinner icon
            ) : (
              <img src="/navigation-icon.png" alt="Target Icon" className="w-6 h-6" /> // Original navigation icon
            )}

          </button>

          {/* Input Text Area */}
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
            
            {/* Spinner icon when loading */}
            {loading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-3 border-[#1e1e1e]"></div> // Loading spinner icon
            ) : (
              <img src="/arrow-icon.png" alt="Arrow Icon" className="w-5 h-5" /> // Original arrow icon
            )}

          </button>

        </div>
        
        <p className='text-[#e0e0e0] text-xs mt-4 lg:mt-6 italic'>Tip: You can pin your exact location later.</p>

      </div>
    </div>
  )
}

export default App