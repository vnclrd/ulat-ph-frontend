import React, { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LocationContent from './LocationContent.jsx'
import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from './DarkModeContext.jsx'
import { useLocation } from 'react-router-dom'
import { initProfanity, containsProfanity } from './profanity'

function Core() {
  // Supabase
  const SUPABASE_PROJECT_ID = 'yxpvelboekyahvwmzjry'

  // Get custom location from App.jsx
  const location = useLocation()

  // Toggle Dark Mode
  const { isDarkMode, toggleDarkMode } = useDarkMode()

  // Profanity Tracking
  const [profanityError, setProfanityError] = useState('')

  useEffect(() => {
    initProfanity()
  }, [])

  const handleToggle = () => {
    toggleDarkMode()
  }

  // Change Language
  const [isFilipino, setIsFilipino] = useState(() => {
    const savedLang = localStorage.getItem('isFilipino')
    return savedLang === 'true' ? true : false
  })

  useEffect(() => {
    localStorage.setItem('isFilipino', isFilipino)
  }, [isFilipino])

  const changeLang = () => {
    setIsFilipino(!isFilipino)
  }

  const translations = {
    en: {
      reports: 'Reports',
      reports_desc: 'near your location:',
      reports_none: 'No reports found.',
      reports_no_image: 'No image available',
      reports_details: 'Select a report to view its details.',
      reports_sightings: 'people saw this issue',
      reports_resolved: 'people say it has been resolved',
      reports_see: 'I see this too',
      reports_seen: "You've seen this",
      reports_has_been_already_resolved: 'Already resolved',
      reports_has_been_resolved: 'Resolved',

      make_report: 'Make a Report',
      make_report_desc: 'near your location:',
      make_report_upload_preview: 'Uploaded image preview',
      make_report_upload: 'Uploaded image preview',
      make_report_selected_image: 'No image selected',
      make_report_choose_image: 'Choose image',
      make_report_discard_image: 'Discard image',
      make_report_choose_issue: 'Select type of issue',
      make_report_custom_issue: 'Custom issue',
      make_report_custom_issue_desc: 'Describe the issue',
      make_report_short_desc: 'Write a short description about the issue',
      make_report_submit_report: 'Submit Report!',
      make_report_submit_success: 'Report submitted successfully!',
      make_report_submit_error: 'Failed to submit report',

      settings_change_lang: 'Change Language',
      settings_select_lang_desc: 'Select your preferred language',

      footer_reports: 'Reports',
      footer_location: 'Location',
      footer_make_report: 'Make Report',
      footer_settings: 'Settings',
    },
    fil: {
      reports: 'Mga Report',
      reports_desc: 'malapit sa iyong lokasyon:',
      reports_none: 'Walang nahanap na ulat.',
      reports_no_image: 'Walang imahe',
      reports_details: 'Pumili ng report para tingnan ang mga detalye nito',
      reports_sightings: 'na tao ang nakakita nito',
      reports_resolved: 'na tao na nagsasabing ito ay nalutas na',
      reports_see: 'Nakita ko rin ito',
      reports_seen: 'Nakita mo ito',
      reports_has_been_already_resolved: 'Nalutas na ito',
      reports_has_been_resolved: 'Nautas na',
      make_report: 'Gumawa ng Report',
      make_report_desc: 'malapit sa iyong lokasyon:',
      make_report_upload_preview: 'Imahe na pinili mo',
      make_report_upload: 'Imahe na pinili mo:',
      make_report_selected_image: 'Wala napiling imahe',
      make_report_choose_image: 'Pumili ng imahe',
      make_report_discard_image: 'Alisin ang imahe',
      make_report_choose_issue: 'Pumili ng isyu',
      make_report_custom_issue: 'Custom issue',
      make_report_custom_issue_desc: 'Ilarawan ang isyu',
      make_report_short_desc: 'Sumulat ng maikling detalye tungkol sa issue',
      make_report_submit_report: 'Isumite and ulat!',
      make_report_submit_success: 'Naisumite na ang ulat!',
      make_report_submit_error: 'Hindi naisumite ang ulat',

      settings_change_lang: 'Baguhin ang Wika',
      settings_select_lang_desc: 'Piliin ang iyong gustong wika',

      footer_reports: 'Mga Report',
      footer_location: 'Lokasyon',
      footer_make_report: 'Gumawa ng Report',
      footer_settings: 'Settings',
    },
  }

  // FILE SAVING COMPONENTS
  const [customIssue, setCustomIssue] = useState('')
  const [description, setDescription] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  // View reports on Reports Page
  const [reports, setReports] = useState([])
  const [allReports, setAllReports] = useState([])
  const [selectedReport, setSelectedReport] = useState(null)

  // Button click tracking states
  const [buttonLoading, setButtonLoading] = useState({})
  const [buttonStatus, setButtonStatus] = useState(null)

  const [activeDiv, setActiveDiv] = useState('div1')
  const baseButtonClassesFooter =
    'flex flex-col items-center justify-center w-[25%] h-[60px] cursor-pointer'

  const [selectedIssue, setSelectedIssue] = useState('')
  const [locationName, setLocationName] = useState('Fetching location...')

  // For already clicked verification
  const [userClickedButtons, setUserClickedButtons] = useState({})

  const [savedLocationData, setSavedLocationData] = useState(() => {
    const stored = localStorage.getItem('savedLocation')
    return stored ? JSON.parse(stored) : {}
  })

  // ============================== Function to Check if User Already Clicked the Buttons ==============================
  const checkUserButtonStatus = async (reportId) => {
    if (!reportId) return

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports/${
          report.id
        }/user-status`
      )
      const result = await response.json()

      if (result.success) {
        setUserClickedButtons((prev) => ({
          ...prev,
          [`${reportId}_sightings`]: result.has_sighting_click,
          [`${reportId}_resolved`]: result.has_resolved_click,
        }))
      }
    } catch (error) {
      console.error('Error checking user button status:', error)
    }
  }

  // ============================== Function to Calculate Distance Between Two Coordinates (Lat, Long) using Haversine Formula ==============================
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Radius of Earth in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c // Distance in km
    return distance
  }

  // ============================== Function to Filter Reports Based on Location ==============================
  const filterReportsByLocation = (allReports, location) => {
    if (!location || !location.lat || !location.lng) {
      setReports([])
      setSelectedReport(null)
      return
    }

    const filtered = allReports.filter((report) => {
      const distance = getDistance(
        location.lat,
        location.lng,
        report.latitude,
        report.longitude
      )
      return distance <= 1 // Filter for reports within 1 km
    })

    setReports(filtered)
    if (filtered.length > 0) {
      setSelectedReport(filtered[0])
    } else {
      setSelectedReport(null)
    }
  }

  // ============================== Function to Refresh Reports Data ==============================
  const fetchReports = async () => {
    try {
      const { lat, lng } = savedLocationData
      if (!lat || !lng) {
        console.warn('Location not available. Cannot fetch nearby reports.')
        return
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports?latitude=${lat}&longitude=${lng}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch reports')
      }
      const data = await response.json()
      // Sort reports by sightings count (highest first)
      const sortedReports = [...data.reports].sort(
        (a, b) => (b.sightings?.count || 0) - (a.sightings?.count || 0)
      )
      setAllReports(sortedReports)
      setReports(sortedReports)
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }

  // ============================== Function to Handle Sightings Button Click ==============================
  const handleSightingsClick = async (reportId) => {
    if (
      !reportId ||
      buttonLoading[`sightings-${reportId}`] ||
      userClickedButtons[`${reportId}_sightings`]
    )
      return

    setButtonLoading((prev) => ({ ...prev, [`sightings-${reportId}`]: true }))
    setButtonStatus(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports/${reportId}/sightings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const result = await response.json()

      if (result.success) {
        // Update counts locally instead of waiting for fetchReports()
        setReports((prevReports) =>
          prevReports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  sightings: {
                    ...report.sightings,
                    count: (report.sightings?.count || 0) + 1,
                  },
                }
              : report
          )
        )

        // Update selected report if it's currently displayed
        if (selectedReport?.id === reportId) {
          setSelectedReport((prev) => ({
            ...prev,
            sightings: {
              ...prev.sightings,
              count: (prev.sightings?.count || 0) + 1,
            },
          }))
        }

        // Mark button as clicked
        setUserClickedButtons((prev) => {
          const updated = {
            ...prev,
            [`${reportId}_sightings`]: true, // or resolved
          }
          localStorage.setItem("userClickedButtons", JSON.stringify(updated))
          return updated
        })

        setButtonStatus({
          type: 'success',
          message: result.message,
        })
      } else {
        setButtonStatus({
          type: 'error',
          message: result.message,
        })
      }
    } catch (error) {
      setButtonStatus({
        type: 'error',
        message: 'Failed to record sighting',
      })
    } finally {
      setButtonLoading((prev) => ({
        ...prev,
        [`sightings-${reportId}`]: false,
      }))
    }
  }

  // ============================== Function to Handle Resolved Button Click ==============================
  const handleResolvedClick = async (reportId) => {
    if (
      !reportId ||
      buttonLoading[`resolved-${reportId}`] ||
      userClickedButtons[`${reportId}_resolved`]
    )
      return

    setButtonLoading((prev) => ({ ...prev, [`resolved-${reportId}`]: true }))
    setButtonStatus(null)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports/${reportId}/resolved`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const result = await response.json()

      if (result.success) {
        // Update counts locally
        setReports((prevReports) =>
          prevReports.map((report) =>
            report.id === reportId
              ? {
                  ...report,
                  resolved: {
                    ...report.resolved,
                    count: (report.resolved?.count || 0) + 1,
                  },
                }
              : report
          )
        )

        // Update selected report if it's currently displayed
        if (selectedReport?.id === reportId) {
          setSelectedReport((prev) => ({
            ...prev,
            resolved: {
              ...prev.resolved,
              count: (prev.resolved?.count || 0) + 1,
            },
          }))
        }

        // Mark button as clicked
        setUserClickedButtons((prev) => {
          const updated = {
            ...prev,
            [`${reportId}_resolved`]: true, // or resolved
          }
          localStorage.setItem("userClickedButtons", JSON.stringify(updated))
          return updated
        })

        setButtonStatus({
          type: 'success',
          message: result.message,
        })
      } else {
        setButtonStatus({
          type: 'error',
          message: result.message,
        })
      }
    } catch (error) {
      setButtonStatus({
        type: 'error',
        message: 'Failed to record resolution',
      })
    } finally {
      setButtonLoading((prev) => ({
        ...prev,
        [`resolved-${reportId}`]: false,
      }))
    }
  }

  // ============================== Load Clicked Buttons ==============================
  useEffect(() => {
    const stored = localStorage.getItem("userClickedButtons")
    if (stored) {
      setUserClickedButtons(JSON.parse(stored))
    }
  }, [])

  // Update your selectedReport useEffect or add this
  useEffect(() => {
    if (selectedReport?.id) {
      checkUserButtonStatus(selectedReport.id)
    }
  }, [selectedReport?.id])

  // Fetch reports from backend (reports.json) and filter them based on location
  useEffect(() => {
    fetchReports()
  }, [savedLocationData])

  // Load saved location on mount
  useEffect(() => {
    const saved = localStorage.getItem('savedLocation')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSavedLocationData(parsed)
        setLocationName(parsed.name || 'Unknown location')
      } catch (err) {
        console.error('Failed to parse saved location:', err)
      }
    }
  }, [])

  // Update the useEffect that loads saved location to also check navigation state
  useEffect(() => {
    // Check if we have navigation state with location data
    if (location.state && location.state.latitude && location.state.longitude) {
      const newLocationData = {
        name: location.state.locationName || 'Selected Location',
        lat: location.state.latitude,
        lng: location.state.longitude,
      }
      
      // Update state
      setSavedLocationData(newLocationData)
      setLocationName(newLocationData.name)
      
      // Save to localStorage for future use
      localStorage.setItem('savedLocation', JSON.stringify(newLocationData))
      
      return // Exit early, don't try to load from localStorage or geolocation
    }

    // If no navigation state, try localStorage
    const saved = localStorage.getItem('savedLocation')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSavedLocationData(parsed)
        setLocationName(parsed.name || 'Unknown location')
        return // Exit early, don't use geolocation
      } catch (err) {
        console.error('Failed to parse saved location:', err)
      }
    }

    // If no saved location and no navigation state, detect current location as fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const newLocation = {
          name: 'Your Current Location',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setSavedLocationData(newLocation)
        setLocationName(newLocation.name)
        localStorage.setItem('savedLocation', JSON.stringify(newLocation))
      })
    }
  }, [location.state]) // Add location.state as dependency

  // Update locationName when savedLocationData changes
  useEffect(() => {
    if (savedLocationData.name) {
      setLocationName(savedLocationData.name)
    }
  }, [savedLocationData])

  // Handler functions for image saving
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadedImage(file)

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handler function for uploaded image discarding
  const handleDiscardImage = () => {
    setUploadedImage(null)
    setImagePreview('')
    // Reset file input
    const fileInput = document.querySelector("input[type='file']")
    if (fileInput) fileInput.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    // Profanity validation (final gate)
    const combinedText =
      `${selectedIssue === 'custom' ? customIssue : selectedIssue} ${description}`

    if (containsProfanity(normalizeText(combinedText))) {
      setIsSubmitting(false)
      setSubmitStatus({
        type: 'error',
        message: 'Profanity detected. Please edit your report and try again.',
      })
      return
    }

    try {
      // Validation
      if (!selectedIssue) {
        throw new Error('Please select an issue type')
      }

      if (selectedIssue === 'custom' && !customIssue.trim()) {
        throw new Error('Please describe the custom issue')
      }

      if (!description.trim()) {
        throw new Error('Please provide a description')
      }

      // Prepare form data
      const formData = new FormData()

      if (uploadedImage) {
        formData.append('image', uploadedImage)
      }

      formData.append('issueType', selectedIssue)
      formData.append('customIssue', customIssue)
      formData.append('description', description)
      formData.append('location', locationName)
      formData.append('latitude', savedLocationData.lat)
      formData.append('longitude', savedLocationData.lng)

      // Submit to backend
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const result = await response.json()

      if (result.success) {
        setSubmitStatus({
          type: 'success',
          message: isFilipino
            ? translations.fil.make_report_submit_success
            : translations.en.make_report_submit_success,
        })

        // Reset form
        setSelectedIssue('')
        setCustomIssue('')
        setDescription('')
        handleDiscardImage()

        // Refresh reports data
        await fetchReports()
      } else {
        throw new Error(
          result.message ||
            (isFilipino
              ? translations.fil.make_report_submit_error
              : translations.en.make_report_submit_error)
        )
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIssueChange = (e) => {
    setSelectedIssue(e.target.value)
  }

  // Handle location updates from LocationContent
  const handleLocationUpdate = (newLocationData) => {
    setSavedLocationData(newLocationData)
    setLocationName(newLocationData.name)
    // Save to localStorage
    localStorage.setItem('savedLocation', JSON.stringify(newLocationData))
  }

  const DefaultIcon = L.icon({
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })
  L.Marker.prototype.options.icon = DefaultIcon

  return (
    <div className='flex flex-col w-full min-h-screen bg-[#009688]'>
      {/* ================================================== Header Content ================================================== */}
      <header
        className={`
          fixed flex w-full h-[75px] top-0 bg-[#008377] z-1000 transition-colors duration-500 ease-in-out
          ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'}`}
      >
        <img
          src='/ulat-ph-logo.png'
          alt='Ulat PH Logo'
          className='m-2.5 ml-5'
        />
        <div className='flex lg:flex-col items-center justify-center'>
          <h1 className='text-[1.5rem] text-[#e0e0e0] font-bold'>Ulat PH</h1>
          <p className='hidden lg:block text-[0.9rem] text-[#e0e0e0] font-light mt-[-5px]'>
            iulat mo na!
          </p>
        </div>
      </header>

      {/* ================================================== Reports Page Content ================================================== */}
      <div
        className={`flex flex-col min-h-screen items-center justify-center pt-[65px] pb-[75px] ${
          activeDiv === 'div1'
            ? isDarkMode
              ? 'bg-[#1b253a]'
              : 'bg-[#008c7f] md:bg-[#009688]'
            : 'hidden'
        }`}
      >
        {/* Panels */}
        <div
          className={`
            flex flex-col md:flex-row items-center md:items-start justify-between
            w-full max-w-[1200px] mx-auto gap-5 p-5
            rounded-[15px] bg-[#008c7f] lg:shadow-lg
            ${isDarkMode ? 'bg-transparent md:bg-[#11161f]' : 'bg-[#008c7f]'}
          `}
        >
          {/* Left Panel */}
          <div className='flex flex-col w-full md:w-[50%] h-auto md:h-[500px]'>
            <div className='flex flex-col items-center text-center md:text-left'>
              <h1
                className={`
                  text-[2rem] md:text-[2.5rem] text-[#e0e0e0] font-bold
                `}
              >
                {isFilipino
                  ? translations.fil.reports
                  : translations.en.reports}
              </h1>
              <p className='text-sm text-[#e0e0e0] mb-5 text-center'>
                {isFilipino
                  ? translations.fil.reports_desc
                  : translations.en.reports_desc}
                <br />
                <span className='italic text-[#e0e0e0]'>{locationName}</span>
              </p>
            </div>

            {/* Reports Container */}
            <div className='flex items-center justify-center'>
              <div
                className='
                  flex flex-col w-full h-[400px] md:h-[350px] pr-3 gap-4 overflow-y-scroll rounded-lg
                  scrollbar scrollbar-thin scrollbar-thumb-[#008c7f] scrollbar-track-[#e0e0e0] 
                '
              >
                {reports.length > 0 ? (
                  reports.map((report) => (
                    <div
                      key={report.id}
                      className={`
                        w-full h-[70px] md:h-[75px] rounded-[25px] bg-[#00786d] flex-shrink-0
                        cursor-pointer p-4
                        ${
                          selectedReport?.id === report.id
                            ? 'border-2 border-[#e0e0e0]'
                            : ''
                        },
                        ${
                          isDarkMode
                            ? 'bg-[#19202b] border-[#e0e0e0]'
                            : 'bg-[#00786d] border-[#e0e0e0]'
                        }
                        `}
                      onClick={() => setSelectedReport(report)}
                    >
                      <div className='flex justify-between items-center w-full'>
                        <div className='flex flex-col'>
                          <h3 className='text-[#e0e0e0] font-bold text-base md:text-lg'>
                            {report.issue_type === 'custom'
                              ? report.custom_issue
                              : report.issue_type}
                          </h3>
                          <p className='text-sm text-[#a0a0a0] truncate mt-[-4px]'>
                            {report.latitude?.toFixed(4)},{' '}
                            {report.longitude?.toFixed(4)}
                          </p>
                        </div>
                        <div className='flex items-center gap-2'>
                          {/* Sightings */}
                          <img
                            src='/vision-icon.png'
                            alt='Sightings Icon'
                            className='w-[26px] h-[26px] filter invert'
                          />
                          <span className='text-[#e0e0e0] text-[1.25rem] mr-2'>
                            {report.sightings?.count || 0}
                          </span>

                          {/* Resolved Votes */}
                          <img
                            src='/resolved-icon.png'
                            alt='Resolved Icon'
                            className='w-[26px] h-[26px]'
                          />
                          <span className='text-[#e0e0e0] text-[1.25rem]'>
                            {report.resolved?.count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='text-[#e0e0e0] text-center italic mt-10'>
                    {isFilipino
                      ? translations.fil.reports_none
                      : translations.en.reports_none}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className='flex items-center justify-center w-full md:w-[50%] h-auto md:h-[500px]'>
            <div className='flex flex-col w-full h-full rounded-[15px] gap-5'>
              {/* Success / Error Modal */}
              <div
                className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${
                  buttonStatus ? 'opacity-100' : 'opacity-0 pointer-events-none'
                } ${isDarkMode ? 'bg-black/80' : 'bg-black/50'}`}
              >
                <div
                  className={`flex flex-col items-center justify-center w-[350px] lg:w-[400px] p-6 rounded-[25px] shadow-xl transition-colors duration-500 ${
                    isDarkMode ? 'bg-[#1e2a44] text-[#e0e0e0]' : 'bg-[#008177] text-[#e0e0e0]'
                  }`}
                >
                  <img src="./ulat-ph-logo.png" alt="Ulat PH Logo" className="w-[75px] h-[75px] mb-4" />
                  <h2 className="text-xl font-bold mb-4 text-center">
                    {buttonStatus?.type === 'success' ? 'Success' : 'Error'}
                  </h2>
                  <p className="text-md text-center mb-6 leading-6">{buttonStatus?.message}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setButtonStatus(null)}
                      className={`
                        text-[#e0e0e0] py-2 px-6 rounded-full transition-colors cursor-pointer
                        ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'}
                      `}
                    >
                      Alright!
                    </button>
                  </div>
                </div>
              </div>
              {/* Image Holder */}
              <div
                className={`
                  w-full h-[200px] md:h-[50%] rounded-[15px] text-[#e0e0e0] flex items-center justify-center
                  ${isDarkMode ? 'bg-[#19202b]' : 'bg-[#00786d]'}
                  `}
              >
                {selectedReport && selectedReport.image_filename ? (
                  <img
                    src={`https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/reports-images/images/${selectedReport.image_filename}`}
                    alt='Photo of report'
                    className='w-full h-full object-contain rounded-[15px]'
                  />
                ) : (
                  <span className='italic'>
                    {isFilipino
                      ? translations.fil.reports_no_image
                      : translations.en.reports_no_image}
                  </span>
                )}
              </div>

              {/* Description */}
              <div className='flex items-center justify-center w-full h-auto gap-2 text-[#e0e0e0] text-sm md:text-[1rem]'>
                <img
                  src='/vision-icon.png'
                  alt='Sightings Icon'
                  className='w-[26px] h-[26px] filter invert'
                />
                <p className='mr-2'>
                  {selectedReport?.sightings?.count || 0}{' '}
                  {isFilipino
                    ? translations.fil.reports_sightings
                    : translations.en.reports_sightings}
                </p>
                <img
                  src='/resolved-icon.png'
                  alt='Resolved Icon'
                  className='w-[26px] h-[26px]'
                />
                <p>
                  {selectedReport?.resolved?.count || 0}{' '}
                  {isFilipino
                    ? translations.fil.reports_resolved
                    : translations.en.reports_resolved}
                </p>
              </div>

              <div
                className={`
                  w-full md:h-[25%] bg-[#00786d] rounded-[15px] text-[#e0e0e0] overflow-y-scroll p-4
                  ${isDarkMode ? 'bg-[#19202b]' : 'bg-[#00786d]'}
                  `}
              >
                <p>
                  {selectedReport?.description ||
                    (isFilipino
                      ? translations.fil.reports_details
                      : translations.en.reports__details)}
                </p>
              </div>

              {/* Buttons */}
              <div className='flex gap-3'>
                {/* Sightings Button */}
                <button
                  onClick={() => handleSightingsClick(selectedReport?.id)}
                  disabled={
                    !selectedReport ||
                    buttonLoading[`sightings-${selectedReport?.id}`] ||
                    userClickedButtons[`${selectedReport?.id}_sightings`]
                  }
                  className={`flex items-center justify-center w-[50%] h-[50px] text-[#e0e0e0] text-[0.8rem] md:text-[1rem] rounded-[15px] transition-colors
                    ${
                      userClickedButtons[`${selectedReport?.id}_sightings`]
                        ? 'bg-gray-500 cursor-not-allowed opacity-60'
                        : 'bg-[#00786d] cursor-pointer hover:bg-[#006b61] disabled:opacity-50 disabled:cursor-not-allowed'
                    },
                    ${
                      isDarkMode
                        ? 'bg-[#040507] hover:bg-[#212730]'
                        : 'bg-[#00786d] hover:bg-[#006b61]'
                    }
                  `}
                >
                  <img
                    src='/vision-icon.png'
                    alt='Vision Icon'
                    className={`w-[30px] md:w-[40px] h-[30px] md:h-[40px] filter mr-2 ${
                      userClickedButtons[`${selectedReport?.id}_sightings`]
                        ? 'invert opacity-60'
                        : 'invert'
                    }`}
                  />
                  {userClickedButtons[`${selectedReport?.id}_sightings`]
                    ? isFilipino
                      ? translations.fil.reports_seen
                      : translations.en.reports_seen
                    : buttonLoading[`sightings-${selectedReport?.id}`]
                    ? 'Loading...'
                    : isFilipino
                    ? translations.fil.reports_see
                    : translations.en.reports_see}
                </button>

                {/* Resolved Button */}
                <button
                  onClick={() => handleResolvedClick(selectedReport?.id)}
                  disabled={
                    !selectedReport ||
                    buttonLoading[`resolved-${selectedReport?.id}`] ||
                    userClickedButtons[`${selectedReport?.id}_resolved`]
                  }
                  className={`flex items-center justify-center w-[50%] h-[50px] text-[#e0e0e0] text-[0.8rem] md:text-[1rem] rounded-[15px] transition-colors
                    ${
                      userClickedButtons[`${selectedReport?.id}_resolved`]
                        ? 'bg-gray-500 cursor-not-allowed opacity-60'
                        : 'bg-[#00786d] cursor-pointer hover:bg-[#006b61] disabled:opacity-50 disabled:cursor-not-allowed'
                    },
                    ${
                      isDarkMode
                        ? 'bg-[#040507] hover:bg-[#212730]'
                        : 'bg-[#00786d] hover:bg-[#006b61]'
                    }
                  `}
                >
                  <img
                    src='/resolved-icon.png'
                    alt='Vision Icon'
                    className={`w-[30px] md:w-[30px] h-[30px] md:h-[30px] mr-1 md:mr-2 ${
                      userClickedButtons[`${selectedReport?.id}_resolved`]
                        ? 'opacity-60'
                        : ''
                    }`}
                  />
                  {userClickedButtons[`${selectedReport?.id}_resolved`]
                    ? isFilipino
                      ? translations.fil.reports_has_been_resolved
                      : translations.en.reports_has_been_resolved
                    : buttonLoading[`resolved-${selectedReport?.id}`]
                    ? 'Loading...'
                    : isFilipino
                    ? translations.fil.reports_has_been_already_resolved
                    : translations.en.reports_has_been_already_resolved}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== Location Page Content ================================================== */}
      <div
        className={`flex flex-col sm:items-center sm:justify-center md:items-center md:justify-center lg:items-center lg:justify-center min-h-screen pt-[65px] pb-[75px] ${
          activeDiv === 'div2'
            ? isDarkMode
              ? 'bg-[#1b253a]'
              : 'bg-[#008c7f] md:bg-[#009688]'
            : 'hidden'
        }`}
      >
        <div
          className={`
            flex flex-col items-center justify-center
            w-full sm:w-[90%] md:w-[80%] lg:w-[1000px]
            h-[500px] sm:h-[500px] md:h-[500px]
            bg-[#008c7f] rounded-[25px] text-[#e0e0e0]
            lg:shadow-lg p-5
            ${isDarkMode ? 'bg-transparent md:bg-[#11161f]' : 'bg-[#008c7f]'}`}
        >
          {/* Location Component */}
          <LocationContent
            location={savedLocationData}
            setLocation={handleLocationUpdate}
          />
        </div>
      </div>

      {/* ================================================== Make Report Page Content ================================================== */}
      <div
        className={`flex flex-col sm:items-center sm:justify-center min-h-screen pt-[75px] pb-[75px] transition-colors duration-500 ease-in-out ${
          activeDiv === 'div3'
            ? isDarkMode
              ? 'bg-[#1b253a]'
              : 'bg-[#008c7f] md:bg-[#009688]'
            : 'hidden'
        }`}
      >
        <div className='flex flex-col w-full h-full items-center justify-center lg:px-5 lg:mt-0'>
          {/* Form Container */}
          <form
            onSubmit={handleSubmit}
            className={`
              flex flex-col items-center w-full sm:w-[90%] md:w-[700px] rounded-[15px] bg-[#008c7f] pt-2 pb-6 px-5 lg:shadow-lg
              ${
                isDarkMode ? 'bg-transparent md:bg-[#11161f]' : 'bg-[#008c7f]'
              }`}
          >
            {/* Page Header */}
            <div className='flex flex-col items-center justify-center w-full mb-5 text-center'>
              <h1 className='text-[2rem] md:text-[2.5rem] text-[#e0e0e0] font-bold md:mt-2'>
                {isFilipino
                  ? translations.fil.make_report
                  : translations.en.make_report}
              </h1>
              <p className='text-sm md:text-[0.9rem] text-[#e0e0e0]'>
                {isFilipino
                  ? translations.fil.make_report_desc
                  : translations.en.make_report_desc}
              </p>
              <p className='text-sm md:text-[0.9rem] text-[#e0e0e0] italic'>
                {locationName}
              </p>
            </div>

            {/* Submit Status Modal */}
            <div
              className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${
                submitStatus ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } ${isDarkMode ? 'bg-black/80' : 'bg-black/50'}`}
            >
              <div
                className={`flex flex-col items-center justify-center w-[350px] lg:w-[400px] p-6 rounded-[25px] shadow-xl transition-colors duration-500 ${
                  isDarkMode ? 'bg-[#1e2a44] text-[#e0e0e0]' : 'bg-[#008177] text-[#e0e0e0]'
                }`}
              >
                <img src="./ulat-ph-logo.png" alt="Ulat PH Logo" className="w-[75px] h-[75px] mb-4" />
                <h2 className="text-xl font-bold mb-4 text-center">
                  {submitStatus?.type === 'success' ? 'Success' : 'Error'}
                </h2>
                <p className="text-md text-center mb-6 leading-6">{submitStatus?.message}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSubmitStatus(null)}
                    className={`text-[#e0e0e0] py-2 px-6 rounded-full transition-colors cursor-pointer ${
                      isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'
                    }`}
                  >
                    Okay!
                  </button>
                </div>
              </div>
            </div>

            {/* Uploaded photo preview */}
            <div
              className={`
                flex items-center justify-center w-full sm:w-[80%] md:w-[400px] h-[180px] sm:h-[200px]
                rounded-xl text-[#e0e0e0] bg-[#009688] mb-3 text-center px-2 overflow-hidden
                ${isDarkMode ? 'bg-[#19202b]' : 'bg-[#008c7f]'}`}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt='Preview'
                  className='max-w-full max-h-full object-contain'
                />
              ) : isFilipino ? (
                translations.fil.make_report_upload_preview
              ) : (
                translations.en.make_report_upload_preview
              )}
            </div>

            {/* Uploaded Image Info */}
            <p className='text-[#e0e0e0] text-xs md:text-sm mb-3 text-center md:text-left'>
              {uploadedImage ? (
                <>
                  {isFilipino
                    ? translations.fil.make_report_upload
                    : translations.en.make_report_upload}{' '}
                  <span className='italic'>{uploadedImage.name}</span>
                </>
              ) : isFilipino ? (
                translations.fil.make_report_selected_image
              ) : (
                translations.en.make_report_selected_image
              )}
            </p>

            {/* Upload / Discard Buttons */}
            <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center sm:justify-start mb-4'>
              <label className='flex items-center justify-center w-full sm:w-[150px] h-[40px] rounded-[15px] text-xs bg-[#e0e0e0] cursor-pointer shadow-[_0_2px_2px_rgba(0,0,0,0.5)]'>
                <img
                  src='/upload-photo-icon.png'
                  alt='Upload Photo Icon'
                  className='w-[24px] h-[24px] mr-2'
                />
                {isFilipino
                  ? translations.fil.make_report_choose_image
                  : translations.en.make_report_choose_image}
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleImageUpload}
                  className='hidden'
                />
              </label>

              <button
                type='button'
                onClick={handleDiscardImage}
                disabled={!uploadedImage}
                className='flex items-center justify-center w-full sm:w-[150px] h-[40px] rounded-[15px] text-xs text-[#e0e0e0] bg-[#ff2c2c] cursor-pointer shadow-[_0_2px_2px_rgba(0,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <img
                  src='/discard-icon.png'
                  alt='Discard Icon'
                  className='w-[20px] h-[20px] mr-2 filter invert brightness-[200%]'
                />
                {isFilipino
                  ? translations.fil.make_report_discard_image
                  : translations.en.make_report_discard_image}
              </button>
            </div>

            {/* Type of issue selection */}
            <div className='relative mb-4 w-full sm:w-[350px]'>
              <select
                name='issues'
                id='issues'
                value={selectedIssue}
                onChange={handleIssueChange}
                className='w-full h-[40px] rounded-[15px] text-sm md:text-base bg-[#e0e0e0] pl-3 pr-10 appearance-none'
                required
              >
                {/* Types of issues */}
                <option value='' disabled>
                  {isFilipino
                    ? translations.fil.make_report_choose_issue
                    : translations.en.make_report_choose_issue}
                </option>
                {/* Custom Issue */}
                <option value='custom'>Custom Issue</option>
                {/* Pothole */}
                <option value='Pothole'>Pothole (Lubak)</option>
                {/* Broken Streetlight */}
                <option value='Broken Streetlight'>
                  Broken Streetlight (Sirang Ilaw ng Poste)
                </option>
              </select>

              {/* Custom arrow */}
              <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4'>
                <img
                  src='/arrow-down.png'
                  alt='Arrow Down Icon'
                  className='w-[18px] h-[18px] md:w-[20px] md:h-[20px]'
                />
              </div>
            </div>

            {/* Custom issue text area */}
            {selectedIssue === 'custom' && (
              <div className='relative w-full sm:w-[350px] mb-4'>
                <textarea
                  name='customIssue'
                  placeholder={isFilipino ? translations.fil.make_report_custom_issue_desc : translations.en.make_report_custom_issue_desczx}
                  value={customIssue}
                  onChange={(e) => {
                    const v = e.target.value
                    setCustomIssue(v)
                    const textToCheck = `${v} ${description}`
                    setProfanityError(
                      containsProfanity(textToCheck)
                        ? 'Please remove profanity before submitting.'
                        : ''
                    )
                  }}
                  className='text-left w-full h-[40px] pl-5 pt-2.5 resize-none rounded-[15px] text-sm md:text-base bg-[#e0e0e0] appearance-none'
                  required={selectedIssue === 'custom'}
                />
              </div>
            )}

            {/* Description Container */}
            <textarea
              name='description'
              placeholder={isFilipino ? translations.fil.make_report_short_desc : translations.en.make_report_short_desc}
              value={description}

              onChange={(e) => {
                const v = e.target.value
                setDescription(v)
                const textToCheck =
                  `${selectedIssue === 'custom' ? customIssue : selectedIssue} ${v}`
                setProfanityError(
                  containsProfanity(textToCheck)
                    ? 'Please remove profanity before submitting.'
                    : ''
                )
              }}
              className={`
                w-full sm:w-[90%] md:w-[600px] h-[100px] resize-none bg-[#009688] text-[#e0e0e0]
                rounded-[15px] mb-5 pl-5 pr-5 pt-4 text-sm md:text-base shadow-inner placeholder-[#e0e0e0]
                ${isDarkMode ? 'bg-[#19202b]' : 'bg-[#008c7f]'}
              `}
              required
            />

            {/* Disable submit button if profanity is present */}
            {profanityError && (
              <p className="text-red-300 text-sm mb-2">{profanityError}</p>
            )}

            {/* Submit Button */}
            <button
              type='submit'
              disabled={isSubmitting || !!profanityError}
              className={`
                flex items-center justify-center w-full sm:w-[90%] md:w-[600px] h-[50px]
                rounded-[15px] text-base md:text-lg bg-[#009688] text-[#e0e0e0]
                cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#006b61] transition-color
                ${
                  isDarkMode
                    ? 'bg-[#19202b] hover:bg-[#212730]'
                    : 'bg-[#008c7f]'
                }
              `}
            >
              <img
                src='/upload-icon.png'
                alt='Upload Icon'
                className='w-[24px] h-[24px] mr-3 filter invert brightness-[200%]'
              />
              {isSubmitting
                ? 'Submitting...'
                : isFilipino
                ? translations.fil.make_report_submit_report
                : translations.en.make_report_submit_report}
            </button>
          </form>
        </div>
      </div>

      {/* ================================================== Settings Page Content ================================================== */}
      <div
        className={`flex flex-col sm:items-center sm:justify-center min-h-screen pt-[75px] pb-[75px] transition-colors duration-500 ease-in-out ${
          activeDiv === 'div4'
            ? isDarkMode
              ? 'bg-[#1b253a]'
              : 'bg-[#009688]'
            : 'hidden'
        }`}
      >
        <div className='flex flex-col w-full h-full lg:h-90 items-center justify-center pl-5 pr-5 gap-5 p-3'>
          {/* Title */}
          <h1 className='text-[2rem] text-[#e0e0e0] md:text-[2.5rem] font-bold mb-[-10px]'>
            Settings
          </h1>

          {/* Dark Mode */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out cursor-pointer text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}`}
            onClick={handleToggle}
          >
            {/* Left Section: Icon + Text */}
            <div className='flex items-center gap-4 sm:gap-5'>
              {isDarkMode ? (
                <Sun className='w-6 h-6 md:w-7 md:h-7' />
              ) : (
                <Moon className='w-6 h-6 md:w-7 md:h-7' />
              )}

              <div className='flex flex-col leading-tight'>
                <h1 className='text-base md:text-lg font-bold'>
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </h1>
                <p className='text-xs md:text-sm'>
                  {isDarkMode
                    ? 'Press/Click to enable light mode'
                    : 'Press/Click to enable dark mode'}
                </p>
              </div>
            </div>

            {/* Right Section: Toggle Button */}
            <div className='flex items-center lg:justify-center w-[100px] md:w-[125px] h-[40px] rounded-xl text-xs md:text-sm'>
              {/* The outer container for the toggle button. */}
              <div
                className={`
                  w-12 h-6 flex items-center rounded-full cursor-pointer transition-colors duration-300 ease-in-out p-0.5
                  ${isDarkMode ? 'bg-[#e0e0e0]' : 'bg-gray-500'}
                `}
              >
                {/* The inner circle of the toggle button. Its position is controlled by the 'isDarkMode' state. */}
                <div
                  className={`
                    w-5 h-5 rounded-full transition-transform duration-300 ease-in-out
                    ${
                      isDarkMode
                        ? 'bg-[#191970] translate-x-6'
                        : 'bg-[#e0e0e0] translate-x-0'
                    }
                  `}
                ></div>
              </div>
            </div>
          </div>

          {/* Select Language */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}`}
          >
            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>
              <img
                src='/language-icon.png'
                alt='Language Icon'
                className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]'
              />
              <div className='flex flex-col leading-tight'>
                <h1 className='text-base md:text-lg font-bold'>
                  {isFilipino
                    ? translations.fil.settings_change_lang
                    : translations.en.settings_change_lang}
                </h1>
                <p className='text-xs md:text-sm'>
                  {isFilipino
                    ? translations.fil.settings_select_lang_desc
                    : translations.en.settings_select_lang_desc}
                </p>
              </div>
            </div>

            {/* Right Section: Select Box */}
            <div className='relative w-[100px] md:w-[125px] h-[40px]'>
              <select
                name='lang'
                id='lang'
                value={isFilipino ? 'filipino' : 'english'}
                onChange={(e) => setIsFilipino(e.target.value === 'filipino')}
                className='bg-[#e0e0e0] text-[#1e1e1e] w-full h-full rounded-xl text-xs md:text-sm appearance-none cursor-pointer focus:outline-none transition-colors duration-500 ease-in-out pl-4 pr-4'
              >
                <option value='english'>English</option>
                <option value='filipino'>Taglish</option>
              </select>
              <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[#1e1e1e]'>
                <svg
                  className='h-5 w-5'
                  xmlns='http://www.w3.org/2000/svg'
                  viewBox='0 0 20 20'
                  fill='currentColor'
                  aria-hidden='true'
                >
                  <path
                    fillRule='evenodd'
                    d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
                    clipRule='evenodd'
                  />
                </svg>
              </span>
            </div>
          </div>

          {/* Report Bug */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}`}
          >
            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>
              <img
                src='/bug-icon.png'
                alt='Bug Icon'
                className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]'
              />
              <div className='flex flex-col leading-tight'>
                <h1 className='text-base md:text-lg font-bold'>Report Bug</h1>
                <p className='text-xs md:text-sm'>
                  Help me improve Ulat PH by reporting issues in the app!
                </p>
              </div>
            </div>

            {/* Right Section: Button */}
            <button
              onClick={() => {
                const url = "https://noteforms.com/forms/ulat-ph-bugsflagsfeedback-e3ymai";
                window.open(url, "ReportBugWindow", "width=500,height=500,resizable=yes");
              }}
              className='flex items-center justify-center w-[100px] md:w-[125px] h-[40px] font-bold bg-[#ff2c2c] rounded-xl text-xs md:text-sm cursor-pointer shadow-[0_2px_2px_rgba(0,0,0,0.5)] gap-1'
            >
              Report
            </button>
          </div>

          {/* Developer */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}`}
          >
            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>
              <img
                src='/user-icon.png'
                alt='User Icon'
                className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]'
              />
              <div className='flex flex-col leading-tight'>
                <h1 className='text-base md:text-lg font-bold'>Developer</h1>
                <p className='text-xs md:text-sm'>Miguel Ivan Calarde</p>
              </div>
            </div>

            {/* Right Section: Social Links */}
            <div className='flex items-center gap-4 sm:gap-5 filter invert brightness-[200%]'>
              <a
                href='https://github.com/vnclrd'
                target='_blank'
                rel='noopener noreferrer'
              >
                <img
                  src='/github-logo.png'
                  alt='GitHub'
                  className='w-7 h-7 md:w-10 md:h-10'
                />
              </a>
              <a
                href='https://www.linkedin.com/in/vnclrd/'
                target='_blank'
                rel='noopener noreferrer'
              >
                <img
                  src='/linkedin-logo.png'
                  alt='LinkedIn'
                  className='w-7 h-7 md:w-10 md:h-10'
                />
              </a>
              <a
                href='https://vnclrd.github.io/miguel-portfolio/'
                target='_blank'
                rel='noopener noreferrer'
              >
                <img
                  src='/portfolio-website-icon.png'
                  alt='Portfolio'
                  className='w-7 h-7 md:w-10 md:h-10'
                />
              </a>
            </div>
          </div>

          {/* About */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}`}
          >
            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>
              <img
                src='/about-icon.png'
                alt='About Icon'
                className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]'
              />
              <h1 className='text-base md:text-lg font-bold'>About</h1>
            </div>

            {/* Right Section */}
            <div className='flex text-left w-full sm:w-[300px] md:w-[500px] h-auto text-xs md:text-sm lg:text-right'>
              <p>
                Ulat PH is a community-driven reporting web app that enables
                civilians to crowdsource and track local community issues.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== Footer ================================================== */}
      <footer
        className={`
          fixed flex justify-around items-center w-full h-[75px] bottom-0 bg-[#008377] p-3 sm:p-5 md:p-5 lg:p-5 z-1000 transition-colors duration-500 ease-in-out
          ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'}`}
      >
        {/* ========================= Reports Button ========================= */}
        {/* activeDiv === 'div4' ? (isDarkMode ? 'bg-[#1b253a]' : 'bg-[#009688]') : 'hidden' */}
        <button
          className={`
            ${baseButtonClassesFooter} ${
            activeDiv === 'div1'
              ? isDarkMode
                ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
              : 'bg-transparent text-[#e0e0e0]'
          }`}
          onClick={() => setActiveDiv('div1')}
        >
          <img
            src='/reports-icon.png'
            alt='Reports Icon'
            className='w-[25px] h-[25px] filter invert'
          />
          <p className='font-light text-sm mt-[1px]'>
            {isFilipino
              ? translations.fil.footer_reports
              : translations.en.footer_reports}
          </p>
        </button>

        {/* ========================= Location Button ========================= */}
        <button
          className={`
            ${baseButtonClassesFooter} ${
            activeDiv === 'div2'
              ? isDarkMode
                ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
              : 'bg-transparent text-[#e0e0e0]'
          }`}
          onClick={() => setActiveDiv('div2')}
        >
          <img
            src='/location-icon.png'
            alt='Location Icon'
            className='w-[25px] h-[25px] filter invert'
          />
          <p className='font-light text-sm mt-[1px]'>
            {isFilipino
              ? translations.fil.footer_location
              : translations.en.footer_location}
          </p>
        </button>

        {/* ========================= Make Report Button ========================= */}
        <button
          className={`
            ${baseButtonClassesFooter} ${
            activeDiv === 'div3'
              ? isDarkMode
                ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
              : 'bg-transparent text-[#e0e0e0]'
          }`}
          onClick={() => setActiveDiv('div3')}
        >
          <img
            src='/make-report-icon.png'
            alt='Make Report Icon'
            className='w-[25px] h-[25px] filter invert'
          />
          <p className='font-light text-xs sm:text-sm md:text-sm lg:text-sm mt-[1px]'>
            {isFilipino
              ? translations.fil.footer_make_report
              : translations.en.footer_make_report}
          </p>
        </button>

        {/* ========================= Settings Button ========================= */}
        <button
          className={`
            ${baseButtonClassesFooter} ${
            activeDiv === 'div4'
              ? isDarkMode
                ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
              : 'bg-transparent text-[#e0e0e0]'
          }`}
          onClick={() => setActiveDiv('div4')}
        >
          <img
            src='/settings-icon.png'
            alt='Settings Icon'
            className='w-[25px] h-[25px] filter invert'
          />
          <p className='font-light text-sm mt-[1px]'>
            {isFilipino
              ? translations.fil.footer_settings
              : translations.en.footer_settings}
          </p>
        </button>
      </footer>
    </div>
  )
}

export default Core
