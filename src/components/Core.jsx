import React, { useEffect, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LocationContent from './LocationContent.jsx'
import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from './DarkModeContext.jsx'
import { useLocation } from 'react-router-dom'
import { initProfanity, containsProfanity, normalizeText, } from '../utils/profanity'
import { supabase } from '../utils/supabaseClient'

function Core() {
  const userId = localStorage.getItem('userId')             // User Authentication

  // ============================== Enhanced Button Validation Functions ==============================

  // Add these state variables to your existing state declarations:
  const [userInteractions, setUserInteractions] = useState({})
  const [loadingInteractions, setLoadingInteractions] = useState(true)
  
  // ============================== Load User Interactions from Supabase ==============================
  const loadUserInteractions = async () => {
    if (!userId) {
      setLoadingInteractions(false)
      return
    }

    try {
      setLoadingInteractions(true)
      
      const { data, error } = await supabase
        .from('user_interactions')
        .select('report_id, interaction_type')
        .eq('user_id', userId)

      if (error) {
        console.error('Error loading user interactions:', error)
        return
      }

      // Convert to object format for quick lookup
      const interactions = {}
      data?.forEach(interaction => {
        const key = `${interaction.report_id}_${interaction.interaction_type}`
        interactions[key] = true
      })

      setUserInteractions(interactions)
      
      // Also update the legacy userClickedButtons state for backward compatibility
      const legacyFormat = {}
      data?.forEach(interaction => {
        legacyFormat[`${interaction.report_id}_${interaction.interaction_type}`] = true
      })
      setUserClickedButtons(legacyFormat)
      
    } catch (err) {
      console.error('Error in loadUserInteractions:', err)
    } finally {
      setLoadingInteractions(false)
    }
  }

  // ============================== Record User Interaction in Supabase ==============================
  const recordUserInteraction = async (reportId, interactionType) => {
    try {
      const { error } = await supabase
        .from('user_interactions')
        .insert([
          {
            user_id: userId,
            report_id: reportId,
            interaction_type: interactionType,
            created_at: new Date().toISOString()
          }
        ])

      if (error) {
        console.error('Error recording user interaction:', error)
        return false
      }

      // Update local state
      const interactionKey = `${reportId}_${interactionType}`
      setUserInteractions(prev => ({
        ...prev,
        [interactionKey]: true
      }))

      // Update legacy state for backward compatibility
      setUserClickedButtons(prev => {
        const updated = {
          ...prev,
          [interactionKey]: true
        }
        localStorage.setItem("userClickedButtons", JSON.stringify(updated))
        return updated
      })

      return true
    } catch (err) {
      console.error('Error in recordUserInteraction:', err)
      return false
    }
  }

  // ============================== Check if User Can Interact with Button ==============================
  const canUserInteract = (reportId, interactionType) => {
    if (!userId || !reportId) return false
    
    const interactionKey = `${reportId}_${interactionType}`
    return !userInteractions[interactionKey] && !userClickedButtons[interactionKey]
  }

  // ============================== Enhanced Sightings Click Handler ==============================
  const handleSightingsClick = async (reportId) => {
    if (!reportId || !userId) return

    // Check if user has already clicked this button
    if (!canUserInteract(reportId, 'sightings')) {
      setButtonStatus({
        type: 'error',
        message: 'You have already marked this report as seen.'
      })
      return
    }

    if (buttonLoading[`sightings-${reportId}`]) return

    setButtonLoading(prev => ({ ...prev, [`sightings-${reportId}`]: true }))
    setButtonStatus(null)

    try {
      // Record the interaction in Supabase first
      const interactionRecorded = await recordUserInteraction(reportId, 'sightings')
      
      if (!interactionRecorded) {
        setButtonStatus({
          type: 'error',
          message: 'Failed to record your interaction. Please try again.'
        })
        return
      }

      // Then call your existing backend API to update the count
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports/${reportId}/sightings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }) // Include user_id in request
        }
      )

      const result = await response.json()

      if (result.success) {
        // Update counts locally
        setReports(prevReports =>
          prevReports.map(report =>
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
          setSelectedReport(prev => ({
            ...prev,
            sightings: {
              ...prev.sightings,
              count: (prev.sightings?.count || 0) + 1,
            },
          }))
        }

        setButtonStatus({
          type: 'success',
          message: 'Thank you for confirming this sighting! Your input helps keep our community informed.'
        })
      } else {
        setButtonStatus({
          type: 'error',
          message: result.message || 'Failed to record sighting'
        })
      }
    } catch (error) {
      console.error('Error in handleSightingsClick:', error)
      setButtonStatus({
        type: 'error',
        message: 'Failed to record sighting. Please try again.'
      })
    } finally {
      setButtonLoading(prev => ({
        ...prev,
        [`sightings-${reportId}`]: false,
      }))
    }
  }

  // ============================== Enhanced Resolved Click Handler ==============================
  const handleResolvedClick = async (reportId) => {
    if (!reportId || !userId) return

    // Check if user has already clicked this button
    if (!canUserInteract(reportId, 'resolved')) {
      setButtonStatus({
        type: 'error',
        message: 'You have already marked this report as resolved.'
      })
      return
    }

    if (buttonLoading[`resolved-${reportId}`]) return

    setButtonLoading(prev => ({ ...prev, [`resolved-${reportId}`]: true }))
    setButtonStatus(null)

    try {
      // Record the interaction in Supabase first
      const interactionRecorded = await recordUserInteraction(reportId, 'resolved')
      
      if (!interactionRecorded) {
        setButtonStatus({
          type: 'error',
          message: 'Failed to record your interaction. Please try again.'
        })
        return
      }

      // Then call your existing backend API to update the count
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/reports/${reportId}/resolved`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId }) // Include user_id in request
        }
      )

      const result = await response.json()

      if (result.success) {
        // Update counts locally
        setReports(prevReports =>
          prevReports.map(report =>
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
          setSelectedReport(prev => ({
            ...prev,
            resolved: {
              ...prev.resolved,
              count: (prev.resolved?.count || 0) + 1,
            },
          }))
        }

        setButtonStatus({
          type: 'success',
          message: 'Thank you for marking this issue as resolved! This helps our community stay updated.'
        })
      } else {
        setButtonStatus({
          type: 'error',
          message: result.message || 'Failed to record resolution'
        })
      }
    } catch (error) {
      console.error('Error in handleResolvedClick:', error)
      setButtonStatus({
        type: 'error',
        message: 'Failed to record resolution. Please try again.'
      })
    } finally {
      setButtonLoading(prev => ({
        ...prev,
        [`resolved-${reportId}`]: false,
      }))
    }
  }

  // ============================== useEffect to Load User Interactions ==============================
  // Replace your existing "Load Clicked Buttons" useEffect with this:
  useEffect(() => {
    if (userId) {
      loadUserInteractions()
    } else {
      // Fallback to localStorage if no userId yet
      const stored = localStorage.getItem('userClickedButtons')
      if (stored) {
        setUserClickedButtons(JSON.parse(stored))
      }
      setLoadingInteractions(false)
    }
  }, [userId])

  

  const [user, setUser] = useState(null)
  const SUPABASE_PROJECT_ID = 'yxpvelboekyahvwmzjry'        // Supabase Backend Connection
  const location = useLocation()                            // Get location from App.jsx
  const { isDarkMode, toggleDarkMode } = useDarkMode()      // Toggle Dark Mode

  // Profanity Tracking
  const [profanityError, setProfanityError] = useState('')  // Detect Profanity in Make Report

  // ============================== Initialize profanity check ==============================
  useEffect(() => {
    initProfanity()
  }, [])

  // ============================== Toggle Dark Mode ==============================
  const handleToggle = () => {
    toggleDarkMode()
  }

  // ============================== Change language to Filipino ==============================
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

  // ============================== Set English/Filipino languages ==============================
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
      make_report_selected_image: 'Walamg napiling imahe',
      make_report_choose_image: 'Pumili ng imahe',
      make_report_discard_image: 'Alisin ang imahe',
      make_report_choose_issue: 'Pumili ng isyu',
      make_report_custom_issue: 'Custom issue',
      make_report_custom_issue_desc: 'Ilarawan ang isyu',
      make_report_short_desc: 'Sumulat ng maikling detalye tungkol sa issue',
      make_report_submit_report: 'Ipasa and ulat!',
      make_report_submit_success: 'Naisumite na ang ulat!',
      make_report_submit_error: 'Hindi naisumite ang ulat',
      settings_change_lang: 'Baguhin ang Wika',
      settings_select_lang_desc: 'Piliin ang iyong gustong wika',
      footer_reports: 'Mga Report',
      footer_location: 'Lokasyon',
      footer_make_report: 'Gumawa ng Report',
      footer_settings: 'Mga Setting',
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
  const baseButtonClassesFooter = 'flex flex-col items-center justify-center w-[25%] h-[60px] cursor-pointer'

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
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/reports/${reportId}/user-status`
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

      // Get the logged-in user's ID from localStorage
      const userId = localStorage.getItem('userId')

      // Include user_id in the request so backend can cross-match seen/resolved reports
      const response = await fetch(
        `${
          import.meta.env.VITE_BACKEND_URL
        }/api/reports?latitude=${lat}&longitude=${lng}&user_id=${userId}`
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

  // ============================== Update locationName when savedLocationData changes ==============================
  useEffect(() => {
    if (savedLocationData.name) {
      setLocationName(savedLocationData.name)
    }
  }, [savedLocationData])

  // ============================== Preview uploaded image ==============================
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

  // ============================== Discard uploaded image ==============================
  const handleDiscardImage = () => {
    setUploadedImage(null)
    setImagePreview('')
    // Reset file input
    const fileInput = document.querySelector("input[type='file']")
    if (fileInput) fileInput.value = ''
  }

  // ============================== Submission handler for making a report ==============================

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    // Profanity validation (final gate)
    const combinedText = `${
      selectedIssue === 'custom' ? customIssue : selectedIssue
    } ${description}`

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

  // ============================== Handle location updates from LocationContent.jsx ==============================
  const handleLocationUpdate = (newLocationData) => {
    setSavedLocationData(newLocationData)
    setLocationName(newLocationData.name)
    localStorage.setItem('savedLocation', JSON.stringify(newLocationData)) // Save location to localStorage
  }

  // ============================== Default Icon Marker for Map ==============================

  const DefaultIcon = L.icon({
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  })
  L.Marker.prototype.options.icon = DefaultIcon

  // ============================== Start of UI ==============================
  return (
    <div className='flex flex-col w-full min-h-screen bg-[#009688]'>

      {/* ================================================== Header Content ================================================== */}
      <header
        className={`
          fixed flex w-full h-[75px] top-0 bg-[#008377] z-1000 transition-colors duration-500 ease-in-out
          ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'}
        `}
      >

        {/* Ulat PH Logo */}
        <img src='/ulat-ph-logo.png' alt='Ulat PH Logo' className='m-2.5 ml-5' />

        {/* Container for "Ulat PH, iulat mo na!" */}
        <div className='flex lg:flex-col items-center justify-center'>

          {/* Ulat PH */}
          <h1 className='text-[1.5rem] text-[#e0e0e0] font-bold'>
            Ulat PH
          </h1>

          {/* iulat mo na! */}
          <p className='hidden lg:block text-[0.9rem] text-[#e0e0e0] font-light mt-[-5px]'>
            iulat mo na!
          </p>

        </div>
      </header>

      {/* ================================================== Reports Page Content ================================================== */}
      <div
        className={`
          flex flex-col min-h-screen items-center justify-center pt-[65px] pb-[75px]
          ${activeDiv === 'div1' ? isDarkMode ? 'bg-[#1b253a]' : 'bg-[#008c7f] md:bg-[#009688]' : 'hidden'}
        `}
      >

        {/* MAIN PANEL */}
        <div
          className={`
            flex flex-col md:flex-row items-center md:items-start justify-between w-full max-w-[1200px] mx-auto gap-5
            p-5 rounded-[15px] bg-[#008c7f] lg:shadow-lg
            ${isDarkMode ? 'bg-transparent md:bg-[#11161f]' : 'bg-[#008c7f]'}
          `}
        >

          {/* LEFT PART OF MAIN PANEL */}
          <div className='flex flex-col w-full md:w-[50%] h-auto md:h-[500px]'>

            {/* Page Title Container */}
            <div className='flex flex-col items-center text-center md:text-left'>

              {/* Reports/Mga Report */}
              <h1 className='text-[2rem] md:text-[2.5rem] text-[#e0e0e0] font-bold'>
                {isFilipino ? translations.fil.reports : translations.en.reports}
              </h1>

              {/* near your location/malapit sa iyong lokasyon */}
              <p className='text-sm text-[#e0e0e0] mb-5 text-center'>
                {isFilipino ? translations.fil.reports_desc : translations.en.reports_desc}

                <br />

                {/* Detected location */}
                <span className='italic text-[#e0e0e0]'>{locationName}</span>
              </p>

            </div>

            {/* Reports Container */}
            <div className='flex items-center justify-center'>

              {/* Scrollable Report Cards Container */}
              <div
                className='
                  flex flex-col w-full h-[400px] md:h-[350px] pr-3 gap-4 overflow-y-scroll rounded-lg
                  scrollbar scrollbar-thin scrollbar-thumb-[#008c7f] scrollbar-track-[#e0e0e0]'
              >
                
                {/* Display Cards */}
                {reports.length > 0 ? (
                  reports.map((report) => (

                    // Show card information if available 
                    <div
                      key={report.id}
                      onClick={() => setSelectedReport(report)}
                      className={`w-full h-[70px] md:h-[75px] rounded-[25px] bg-[#00786d] flex-shrink-0 cursor-pointer p-4
                        ${selectedReport?.id === report.id ? 'border-2 border-[#e0e0e0]' : ''},
                        ${isDarkMode ? 'bg-[#19202b] border-[#e0e0e0]' : 'bg-[#00786d] border-[#e0e0e0]'}
                      `}
                    >

                      {/* Report Card Container */}
                      <div className='flex justify-between items-center w-full'>

                        {/* Left Part of Card */}
                        <div className='flex flex-col'>

                          {/* Report Name (Pothole, Broken Streetlight, etc...) */}
                          <h3 className='text-[#e0e0e0] font-bold text-base md:text-lg'>
                            {report.issue_type === 'custom' ? report.custom_issue : report.issue_type}
                          </h3>

                          {/* Location Coordinates */}
                          <p className='text-sm text-[#a0a0a0] truncate mt-[-4px]'>
                            {report.latitude?.toFixed(4)},{' '}{report.longitude?.toFixed(4)}
                          </p>

                        </div>

                        {/* Right Part of Card */}
                        <div className='flex items-center gap-2'>

                          {/* Sightings Icon */}
                          <img src='/vision-icon.png' alt='Sightings Icon' className='w-[26px] h-[26px] filter invert' />

                          {/* Sightings Count */}
                          <span className='text-[#e0e0e0] text-[1.25rem] mr-2'>{report.sightings?.count || 0}</span>

                          {/* Resolved Icon */}
                          <img src='/resolved-icon.png' alt='Resolved Icon' className='w-[26px] h-[26px]' />

                          {/* Resolved Count */}
                          <span className='text-[#e0e0e0] text-[1.25rem]'>{report.resolved?.count || 0}</span>

                        </div>
                      </div>
                    </div>
                  ))
                ) : (

                  // "No reports found."
                  <div className='text-[#e0e0e0] text-center italic mt-10'>

                    {isFilipino ? translations.fil.reports_none : translations.en.reports_none}
                    
                  </div>

                )}

              </div>
            </div>
          </div>

          {/* RIGHT PART OF MAIN PANEL */}
          <div className='w-full md:w-[50%] h-auto md:h-[500px] gap-4'>

            {/* Container of Success/Error Modal Popup (Take up whole screen) */}
            <div className='flex flex-col w-full h-full rounded-[15px]'>

              {/* Success/Error Modal */}
              <div
                className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300
                  ${buttonStatus ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                  ${isDarkMode ? 'bg-black/80' : 'bg-black/50'}
                `}
              >

                <div
                  className={`flex flex-col items-center justify-center w-[350px] lg:w-[400px] p-6 rounded-[25px] shadow-xl transition-colors duration-500
                    ${isDarkMode ? 'bg-[#1e2a44] text-[#e0e0e0]' : 'bg-[#008177] text-[#e0e0e0]'}
                  `}
                >

                  {/* Ulat PH Logo */}
                  <img src='./ulat-ph-logo.png' alt='Ulat PH Logo' className='w-[75px] h-[75px] mb-4' />
                  
                  {/* Message if Success or Error */}
                  <h2 className='text-xl font-bold mb-4 text-center'>
                    {buttonStatus?.type === 'success' ? 'Success' : 'Error'}
                  </h2>
                  
                  {/* Description of Success or Error */}
                  <p className='text-md text-center mb-6 leading-6'>
                    {buttonStatus?.message}
                  </p>
                  
                  {/* Success Modal Button Container */}
                  <div className='flex gap-3'>

                    {/* Success Modal Button */}
                    <button
                      onClick={() => setButtonStatus(null)}
                      className={`text-[#e0e0e0] py-2 px-6 rounded-full transition-colors cursor-pointer
                        ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'}
                      `}
                    >
                      Alright!
                    </button>

                  </div>
                </div>
              </div>

              {/* Top Part */}
              <div className='flex w-full h-[60%] gap-4'>

                {/* Image Holder */}
                <div
                  className={`
                    w-[50%] md:w-[50%] md:h-full rounded-[15px] text-[#e0e0e0] flex items-center justify-center
                    ${isDarkMode ? 'bg-[#19202b]' : 'bg-[#00786d]'}
                  `}
                >

                  {/* Image of report retrieval */}
                  {selectedReport && selectedReport.image_filename ? (

                    // Retrieve image of report from database (Supbase)
                    <img 
                      src={`https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/reports-images/images/${selectedReport.image_filename}`}
                      alt='Photo of report'
                      className='w-full h-full object-cover rounded-[15px]'
                    />

                  ) : (

                    // Message if there is no image in the report
                    <span className='italic'>
                      {isFilipino ? translations.fil.reports_no_image : translations.en.reports_no_image}
                    </span>
                  
                  )}
                </div>

                {/* Description */}
                <div 
                  className={`
                    w-[50%] h-full md:h-full bg-[#00786d] rounded-[15px] text-sm md:text-[1rem] text-[#e0e0e0] overflow-y-scroll p-4
                    ${isDarkMode ? 'bg-[#19202b]' : 'bg-[#00786d]'}
                  `}
                >

                  {/* Description of Image */}
                  <p>
                    {selectedReport?.description || (isFilipino ? translations.fil.reports_details : translations.en.reports_details)}
                  </p>
                  
                </div>
              </div>
              
              {/* Bottom Part */}
              <div className='flex flex-col items-center justify-center w-full h-[40%]'>

                {/* Sightings and Resolved Container */}
                <div className='flex flex-col items-center justify-center w-full h-full text-[#e0e0e0] text-sm md:text-lg'>
                  
                  {/* Sightings Container */}
                  <div className='flex gap-2 mb-2 items-center'>

                    {/* Sightings Icon */}
                    <img src='/vision-icon.png' alt='Sightings Icon' className='w-[26px] h-[26px] filter invert' />

                    {/* Sightings Count */}
                    <p className='mr-2'>
                      {selectedReport?.sightings?.count || 0} {isFilipino ? translations.fil.reports_sightings : translations.en.reports_sightings}
                    </p>

                  </div>
                  
                  {/* Resolved Container */}
                  <div className='flex gap-2 items-center'>

                    {/* Resolved Icon */}
                    <img src='/resolved-icon.png' alt='Resolved Icon' className='w-[26px] h-[26px]' />

                    {/* Resolved Count */}
                    <p>
                      {selectedReport?.resolved?.count || 0} {isFilipino ? translations.fil.reports_resolved : translations.en.reports_resolved}
                    </p>

                  </div>
                </div>

                {/* Buttons */}
                <div className='flex flex-col w-full gap-2'>

                  {/* Sightings Button */}
                  <button 
                    onClick={() => handleSightingsClick(selectedReport?.id)}
                    disabled={
                      !selectedReport || 
                      buttonLoading[`sightings-${selectedReport?.id}`] || 
                      !canUserInteract(selectedReport?.id, 'sightings') ||
                      loadingInteractions
                    }
                    className={`flex items-center justify-center w-full h-[50px] text-[#e0e0e0] text-[0.8rem] md:text-[1rem] rounded-[15px] transition-colors
                      ${
                        userClickedButtons[`${selectedReport?.id}_sightings`]
                        ? 'bg-gray-500 cursor-not-allowed opacity-60'
                        : 'bg-[#00786d] cursor-pointer hover:bg-[#006b61] disabled:opacity-50 disabled:cursor-not-allowed'
                      },
                      ${isDarkMode ? 'bg-[#040507] hover:bg-[#212730]' : 'bg-[#00786d] hover:bg-[#006b61]'}
                    `}
                  >

                    {/* Sightings Icon */}
                    <img
                      src='/vision-icon.png'
                      alt='Vision Icon'
                      className={`w-[30px] md:w-[30px] h-[30px] md:h-[30px] filter mr-2
                        ${userClickedButtons[`${selectedReport?.id}_sightings`] ? 'invert opacity-60' : 'invert'}
                      `}
                    />

                    {userClickedButtons[`${selectedReport?.id}_sightings`] 
                      ? (isFilipino ? translations.fil.reports_seen : translations.en.reports_seen)
                      : buttonLoading[`sightings-${selectedReport?.id}`] 
                        ? 'Loading...' 
                        : (isFilipino ? translations.fil.reports_see : translations.en.reports_see)
                    }
                  </button>

                  {/* Resolved Button */}
                  <button 
                    onClick={() => handleResolvedClick(selectedReport?.id)}
                    disabled={
                      !selectedReport || 
                      buttonLoading[`resolved-${selectedReport?.id}`] || 
                      !canUserInteract(selectedReport?.id, 'resolved') ||
                      loadingInteractions
                    }
                    className={`flex items-center justify-center w-full h-[50px] text-[#e0e0e0] text-[0.8rem] md:text-[1rem] rounded-[15px] transition-colors
                      ${
                        userClickedButtons[`${selectedReport?.id}_resolved`]
                        ? 'bg-gray-500 cursor-not-allowed opacity-60'
                        : 'bg-[#00786d] cursor-pointer hover:bg-[#006b61] disabled:opacity-50 disabled:cursor-not-allowed'
                      },
                      ${isDarkMode ? 'bg-[#040507] hover:bg-[#212730]' : 'bg-[#00786d] hover:bg-[#006b61]'}
                    `}
                  >
                    {/* Resolved Icon */}
                    <img
                      src='/resolved-icon.png'
                      alt='Vision Icon'
                      className={`w-[30px] md:w-[30px] h-[30px] md:h-[30px] mr-1 md:mr-2
                        ${userClickedButtons[`${selectedReport?.id}_resolved`] ? 'opacity-60' : ''}
                      `}
                    />

                    {userClickedButtons[`${selectedReport?.id}_resolved`] 
                      ? (isFilipino ? translations.fil.reports_has_been_resolved : translations.en.reports_has_been_resolved)
                      : buttonLoading[`resolved-${selectedReport?.id}`] 
                        ? 'Loading...' 
                        : (isFilipino ? translations.fil.reports_has_been_already_resolved : translations.en.reports_has_been_already_resolved)
                    }

                  </button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================== Location Page Content ================================================== */}
      <div
        className={`
          flex flex-col sm:items-center sm:justify-center md:items-center md:justify-center lg:items-center lg:justify-center min-h-screen pt-[65px] pb-[75px]
          ${activeDiv === 'div2' ? isDarkMode ? 'bg-[#1b253a]' : 'bg-[#008c7f] md:bg-[#009688]' : 'hidden'}
        `}
      >

        {/* MAIN PANEL */}
        <div
          className={`
            flex flex-col items-center justify-center w-full sm:w-[90%] md:w-[80%] lg:w-[1000px] h-[500px] sm:h-[500px]
            md:h-[500px] bg-[#008c7f] rounded-[25px] text-[#e0e0e0] lg:shadow-lg p-5
            ${isDarkMode ? 'bg-transparent md:bg-[#11161f]' : 'bg-[#008c7f]'}
          `}
        >

          {/* Location Component */}
          <LocationContent location={savedLocationData} setLocation={handleLocationUpdate} />

        </div>
      </div>

      {/* ================================================== Make Report Page Content ================================================== */}
      <div
        className={`
          flex flex-col sm:items-center sm:justify-center min-h-screen pt-[75px] pb-[75px] transition-colors duration-500 ease-in-out
          ${activeDiv === 'div3' ? isDarkMode ? 'bg-[#1b253a]' : 'bg-[#008c7f] md:bg-[#009688]' : 'hidden'}
        `}
      >

        {/* Container to Center Form Container */}
        <div className='flex flex-col w-full h-full items-center justify-center lg:px-5 lg:mt-0'>

          {/* Form Container */}
          <form
            onSubmit={handleSubmit}
            className={`
              flex flex-col items-center w-full sm:w-[90%] md:w-[700px] rounded-[15px] bg-[#008c7f] pt-2 pb-6 px-5 lg:shadow-lg
              ${isDarkMode ? 'bg-transparent md:bg-[#11161f]' : 'bg-[#008c7f]'}
            `}
          >

            {/* Page Header */}
            <div className='flex flex-col items-center justify-center w-full mb-5 text-center'>

              {/* Make a Report/Gumawa ng Report */}
              <h1 className='text-[2rem] md:text-[2.5rem] text-[#e0e0e0] font-bold md:mt-2'>
                {isFilipino ? translations.fil.make_report : translations.en.make_report}
              </h1>

              {/* near your location/malapit sa iyong lokasyon */}
              <p className='text-sm md:text-[0.9rem] text-[#e0e0e0]'>
                {isFilipino ? translations.fil.make_report_desc : translations.en.make_report_desc}
              </p>

              {/* location */}
              <p className='text-sm md:text-[0.9rem] text-[#e0e0e0] italic'>
                {locationName}
              </p>

            </div>

            {/* Submit Status Modal */}
            {/* Darken Background */}
            <div
              className={`
                fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300
                ${submitStatus ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                ${isDarkMode ? 'bg-black/80' : 'bg-black/50'}
              `}
            >

              {/* Modal Container */}
              <div
                className={`
                  flex flex-col items-center justify-center w-[350px] lg:w-[400px] p-6 rounded-[25px] shadow-xl transition-colors duration-500
                  ${isDarkMode ? 'bg-[#1e2a44] text-[#e0e0e0]' : 'bg-[#008177] text-[#e0e0e0]'}
                `}
              >

                {/* Ulat PH Logo */}
                <img src='./ulat-ph-logo.png' alt='Ulat PH Logo' className='w-[75px] h-[75px] mb-4' />
                
                {/* Success or Error Title */}
                <h2 className='text-xl font-bold mb-4 text-center'>
                  {submitStatus?.type === 'success' ? 'Success' : 'Error'}
                </h2>

                {/* Success or Error Description */}
                <p className='text-md text-center mb-6 leading-6'>
                  {submitStatus?.message}
                </p>
                
                {/* Div for Button */}
                <div className='flex gap-3'>

                  {/* Alright Button */}
                  <button
                    onClick={() => setSubmitStatus(null)}
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

            {/* Uploaded photo preview */}
            <div
              className={`
                flex items-center justify-center w-full sm:w-[80%] md:w-[400px] h-[180px] sm:h-[200px]
                rounded-xl text-[#e0e0e0] bg-[#009688] mb-3 text-center px-2 overflow-hidden
                ${isDarkMode ? 'bg-[#19202b]' : 'bg-[#008c7f]'}
              `}
            >

              {/* Image Preview */}
              {imagePreview ? (
                <img src={imagePreview} alt='Preview' className='max-w-full max-h-full object-contain' />
              ) : isFilipino ? (
                translations.fil.make_report_upload_preview
              ) : (
                translations.en.make_report_upload_preview
              )}

            </div>

            {/* Uploaded Image Info */}
            <p className='text-[#e0e0e0] text-xs md:text-sm mb-3 text-center md:text-left'>
              
              {/* Name of Uploaded Image */}
              {uploadedImage ? (
                <>
                  {isFilipino ? translations.fil.make_report_upload : translations.en.make_report_upload}{' '}
                  <span className='italic'>{uploadedImage.name}</span>
                </>
              ) : isFilipino ? (
                translations.fil.make_report_selected_image
              ) : (
                translations.en.make_report_selected_image
              )}
            
            </p>

            {/* Upload and Discard Buttons */}
            <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center sm:justify-start mb-4'>

              {/* Upload Button */}
              <label className='flex items-center justify-center w-full sm:w-[150px] h-[40px] rounded-[15px] text-xs bg-[#e0e0e0] cursor-pointer shadow-[_0_2px_2px_rgba(0,0,0,0.5)]'>
                
                {/* Upload Image Icon */}
                <img src='/upload-photo-icon.png' alt='Upload Photo Icon' className='w-[24px] h-[24px] mr-2' />
                
                {/* Choose image */}
                {isFilipino ? translations.fil.make_report_choose_image : translations.en.make_report_choose_image}

                {/* Upload Image Here */}
                <input
                  type='file'
                  accept='image/*'
                  onChange={handleImageUpload}
                  className='hidden'
                />

              </label>

              {/* Discard Button */}
              <button
                type='button'
                onClick={handleDiscardImage}
                disabled={!uploadedImage}
                className='
                  flex items-center justify-center w-full sm:w-[150px]
                  h-[40px] rounded-[15px] text-xs text-[#e0e0e0] bg-[#ff2c2c]
                  cursor-pointer shadow-[_0_2px_2px_rgba(0,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed'
              >

                {/* Discard Icon */}
                <img src='/discard-icon.png' alt='Discard Icon' className='w-[20px] h-[20px] mr-2 filter invert brightness-[200%]' />

                {/* Discard Image */}
                {isFilipino ? translations.fil.make_report_discard_image : translations.en.make_report_discard_image}

              </button>

            </div>

            {/* Type of issue selection */}
            <div className='relative mb-4 w-full sm:w-[350px]'>

              {/* List of issues */}
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
                  {isFilipino ? translations.fil.make_report_choose_issue : translations.en.make_report_choose_issue}
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

                {/* Dropdown Arrow Icon */}
                <img src='/arrow-down.png' alt='Arrow Down Icon' className='w-[18px] h-[18px] md:w-[20px] md:h-[20px]' />

              </div>
            </div>

            {/* Custom Issue Text Area */}
            {selectedIssue === 'custom' && (
              <div className='relative w-full sm:w-[350px] mb-4'>

                <textarea
                  name='customIssue'
                  placeholder={ isFilipino ? translations.fil.make_report_custom_issue_desc : translations.en.make_report_custom_issue_desc}
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
                  className='
                    text-left w-full h-[40px] pl-5 pt-2.5 resize-none rounded-[15px] text-sm md:text-base bg-[#e0e0e0] appearance-none'
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
                const textToCheck = `${
                  selectedIssue === 'custom' ? customIssue : selectedIssue
                } ${v}`
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
              <p className='text-red-300 text-sm mb-2'>{profanityError}</p>
            )}

            {/* Submit Button */}
            <button
              type='submit'
              disabled={isSubmitting || !!profanityError}
              className={`
                flex items-center justify-center w-full sm:w-[90%] md:w-[600px] h-[50px]
                rounded-[15px] text-base md:text-lg bg-[#009688] text-[#e0e0e0]
                cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#006b61] transition-color
                ${isDarkMode ? 'bg-[#19202b] hover:bg-[#212730]' : 'bg-[#008c7f]'}
              `}
            >

              {/* Upload Icon */}
              <img src='/upload-icon.png' alt='Upload Icon' className='w-[24px] h-[24px] mr-3 filter invert brightness-[200%]' />

              {/* Submit Report!/Ipasa ang ulat! */}
              {isSubmitting
                ? 'Submitting...'
                : isFilipino
                ? translations.fil.make_report_submit_report
                : translations.en.make_report_submit_report
              }

            </button>

          </form>
        </div>
      </div>

      {/* ================================================== Settings Page Content ================================================== */}
      <div
        className={`
          flex flex-col sm:items-center sm:justify-center min-h-screen pt-[75px] pb-[75px] transition-colors duration-500 ease-in-out
          ${activeDiv === 'div4' ? isDarkMode ? 'bg-[#1b253a]' : 'bg-[#009688]' : 'hidden'}
        `}
      >

        {/* Title and Cards Container */}
        <div className='flex flex-col w-full h-full lg:h-90 items-center justify-center pl-5 pr-5 gap-5 p-3'>

          {/* Title */}
          <h1 className='text-[2rem] text-[#e0e0e0] md:text-[2.5rem] font-bold mb-[-10px]'>
            Settings
          </h1>

          {/* Dark Mode Card */}
          <div
            onClick={handleToggle}
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out cursor-pointer text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}
            `}
          >

            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>
              {isDarkMode ? (
                <Sun className='w-6 h-6 md:w-7 md:h-7' />
              ) : (
                <Moon className='w-6 h-6 md:w-7 md:h-7' />
              )}

              <div className='flex flex-col leading-tight'>

                {/* Dark Mode/Light Mode */}
                <h1 className='text-base md:text-lg font-bold'>
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </h1>

                {/* Press/Click to enable dark mode/light mode */}
                <p className='text-xs md:text-sm'>
                  {isDarkMode
                    ? 'Press/Click to enable light mode'
                    : 'Press/Click to enable dark mode'}
                </p>

              </div>
            </div>

            {/* Right Section: Toggle Button */}
            <div className='flex items-center lg:justify-center w-[100px] md:w-[125px] h-[40px] rounded-xl text-xs md:text-sm'>

              {/* Toggle Button Container */}
              <div
                className={`
                  w-12 h-6 flex items-center rounded-full cursor-pointer transition-colors duration-300 ease-in-out p-0.5
                  ${isDarkMode ? 'bg-[#e0e0e0]' : 'bg-gray-500'}
                `}
              >

                {/* Toggle Button Circle */}
                <div
                  className={`
                    w-5 h-5 rounded-full transition-transform duration-300 ease-in-out
                    ${isDarkMode ? 'bg-[#191970] translate-x-6' : 'bg-[#e0e0e0] translate-x-0'}
                  `}
                >
                </div>
              </div>
            </div>
          </div>

          {/* Select Language */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}
            `}
          >

            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>

              {/* Language Icon */}
              <img src='/language-icon.png' alt='Language Icon' className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]' />

              {/* Text Container */}
              <div className='flex flex-col leading-tight'>

                {/* Change Language/Baguhin ang Wika */}
                <h1 className='text-base md:text-lg font-bold'>
                  {isFilipino ? translations.fil.settings_change_lang : translations.en.settings_change_lang}
                </h1>

                {/* Select your preferred language/Piliin ang iyong gustong wika */}
                <p className='text-xs md:text-sm'>
                  {isFilipino ? translations.fil.settings_select_lang_desc : translations.en.settings_select_lang_desc}
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
                className='
                  bg-[#e0e0e0] text-[#1e1e1e] w-full h-full rounded-xl
                  text-xs md:text-sm appearance-none cursor-pointer focus:outline-none
                  transition-colors duration-500 ease-in-out pl-4 pr-4
                '
              >

                {/* English Option */}
                <option value='english'>English</option>

                {/* Taglish Option */}
                <option value='filipino'>Taglish</option>

              </select>
              
              {/* Dropdown Arrow Icon */}
              <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-[#1e1e1e]'>
                <svg className='h-5 w-5' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
                  <path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
                </svg>
              </span>

            </div>
          </div>

          {/* Report Bug */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}
            `}
          >

            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>

              {/* Bug Icon */}
              <img src='/bug-icon.png' alt='Bug Icon' className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]' />

              {/* Text Container */}
              <div className='flex flex-col leading-tight'>

                {/* Report Bug */}
                <h1 className='text-base md:text-lg font-bold'>Report Bug</h1>

                {/* Help me improve Ulat PH by reporting issues in the app! */}
                <p className='text-xs md:text-sm'>
                  Help me improve Ulat PH by reporting issues in the app!
                </p>

              </div>
            </div>

            {/* Right Section: Button */}
            <button
              onClick={() => {
                const url =
                  'https://noteforms.com/forms/ulat-ph-bugsflagsfeedback-e3ymai'
                window.open(
                  url,
                  'ReportBugWindow',
                  'width=500,height=500,resizable=yes'
                )
              }}
              className='
                flex items-center justify-center w-[100px] md:w-[125px]
                h-[40px] font-bold bg-[#ff2c2c] rounded-xl text-xs
                md:text-sm cursor-pointer shadow-[0_2px_2px_rgba(0,0,0,0.5)] gap-1'
            >
              Report
            </button>

          </div>

          {/* Developer */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%]
              h-auto min-h-[75px] flex-col sm:flex-row lg:items-center
              justify-between rounded-2xl text-base md:text-lg p-5
              gap-3 shadow-lg transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}
            `}
          >

            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>

              {/* User Icon */}
              <img src='/user-icon.png' alt='User Icon' className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]' />

              {/* Text Container */}
              <div className='flex flex-col leading-tight'>

                {/* Developer */}
                <h1 className='text-base md:text-lg font-bold'>Developer</h1>

                {/* Miguel Ivan Calarde */}
                <p className='text-xs md:text-sm'>Miguel Ivan Calarde</p>

              </div>

            </div>

            {/* Right Section: Social Links */}
            <div className='flex items-center gap-4 sm:gap-5 filter invert brightness-[200%]'>

              {/* GitHub */}
              <a href='https://github.com/vnclrd' target='_blank' rel='noopener noreferrer'>
                {/* GitHub Icon */}
                <img src='/github-logo.png' alt='GitHub Icon' className='w-7 h-7 md:w-10 md:h-10' />
              </a>

              {/* LinkedIn */}
              <a href='https://www.linkedin.com/in/vnclrd/' target='_blank' rel='noopener noreferrer'>
                {/* LinkedIn Icon */}
                <img src='/linkedin-logo.png' alt='LinkedIn Icon' className='w-7 h-7 md:w-10 md:h-10' />
              </a>

              {/* Portfolio Website */}
              <a href='https://vnclrd.github.io/miguel-portfolio/' target='_blank' rel='noopener noreferrer'>
                {/* Website Icon */}
                <img src='/portfolio-website-icon.png' alt='Portfolio Website' className='w-7 h-7 md:w-10 md:h-10' />
              </a>

            </div>
          </div>

          {/* About */}
          <div
            className={`
              flex w-full sm:w-[90%] md:w-[70%] lg:w-[50%] h-auto min-h-[75px] flex-col sm:flex-row lg:items-center justify-between rounded-2xl text-base md:text-lg p-5 gap-3 shadow-lg 
              transition-colors duration-500 ease-in-out text-[#e0e0e0]
              ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#008c7f]'}
            `}
          >

            {/* Left Section */}
            <div className='flex items-center gap-4 sm:gap-5'>

              {/* About Icon */}
              <img src='/about-icon.png' alt='About Icon' className='w-6 h-6 md:w-7 md:h-7 filter invert brightness-[200%]' />

              {/* About */}
              <h1 className='text-base md:text-lg font-bold'>About</h1>

            </div>

            {/* Right Section: Description */}
            <div className='flex text-left w-full sm:w-[300px] md:w-[500px] h-auto text-xs md:text-sm lg:text-right'>

              {/* Description */}
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
          ${isDarkMode ? 'bg-[#11161f]' : 'bg-[#00786d]'}
        `}
      >

        {/* ========================= Reports Button ========================= */}
        <button
          onClick={() => setActiveDiv('div1')}
          className={`
            ${baseButtonClassesFooter}
            ${
              activeDiv === 'div1'
                ? isDarkMode
                  ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                  : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-transparent text-[#e0e0e0]'
            }
          `}
        >

          {/* Reports Icon */}
          <img src='/reports-icon.png' alt='Reports Icon' className='w-[25px] h-[25px] filter invert' />

          {/* Reports/Mga Ulat */}
          <p className='font-light text-sm mt-[1px]'>
            {isFilipino ? translations.fil.footer_reports : translations.en.footer_reports}
          </p>

        </button>

        {/* ========================= Location Button ========================= */}
        <button
          onClick={() => setActiveDiv('div2')}
          className={`
            ${baseButtonClassesFooter}
            ${
              activeDiv === 'div2'
                ? isDarkMode
                  ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                  : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-transparent text-[#e0e0e0]'
            }
          `}
        >

          {/* Location Icon */}
          <img src='/location-icon.png' alt='Location Icon' className='w-[25px] h-[25px] filter invert' />

          {/* Location/Lokasyon */}
          <p className='font-light text-sm mt-[1px]'>
            {isFilipino ? translations.fil.footer_location : translations.en.footer_location}
          </p>

        </button>

        {/* ========================= Make Report Button ========================= */}
        <button
          onClick={() => setActiveDiv('div3')}
          className={`
            ${baseButtonClassesFooter}
            ${
              activeDiv === 'div3'
                ? isDarkMode
                  ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                  : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-transparent text-[#e0e0e0]'
            }
          `}
        >

          {/* Make Report Icon */}
          <img src='/make-report-icon.png' alt='Make Report Icon' className='w-[25px] h-[25px] filter invert' />

          {/* Make Report/Gumawa ng Ulat */}
          <p className='font-light text-xs sm:text-sm md:text-sm lg:text-sm mt-[1px]'>
            {isFilipino ? translations.fil.footer_make_report : translations.en.footer_make_report}
          </p>

        </button>

        {/* ========================= Settings Button ========================= */}
        <button
          onClick={() => setActiveDiv('div4')}
          className={`
            ${baseButtonClassesFooter}
            ${
            activeDiv === 'div4'
              ? isDarkMode
                ? 'bg-[#1b253a] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
                : 'bg-[#006057] text-[#e0e0e0] rounded-[15px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] transition-colors duration-500 ease-in-out'
              : 'bg-transparent text-[#e0e0e0]'
            }
          `}
        >

          {/* Settings Icon */}
          <img src='/settings-icon.png' alt='Settings Icon' className='w-[25px] h-[25px] filter invert' />
          
          {/* Settings/Mga Settings Icon */}
          <p className='font-light text-sm mt-[1px]'>
            {isFilipino ? translations.fil.footer_settings : translations.en.footer_settings}
          </p>

        </button>

      </footer>
    </div>
  )
}

export default Core
