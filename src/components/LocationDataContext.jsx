import { createContext, useContext, useState } from 'react';

// Create a new context
const LocationDataContext = createContext(null);

// Create the context provider component
export const LocationDataProvider = ({ children }) => {
  const [locationData, setLocationData] = useState(() => {
    // Get initial location data from session storage
    const savedLocation = sessionStorage.getItem('savedLocation');
    return savedLocation ? JSON.parse(savedLocation) : null;
  });

  // Function to save location data to state and session storage
  const saveLocationData = (data) => {
    setLocationData(data);
    sessionStorage.setItem('savedLocation', JSON.stringify(data));
  };

  return (
    <LocationDataContext.Provider value={{ locationData, saveLocationData }}>
      {children}
    </LocationDataContext.Provider>
  );
};

// Create a custom hook to use the location data context
export const useLocationData = () => {
  const context = useContext(LocationDataContext);
  if (context === undefined) {
    throw new Error('useLocationData must be used within a LocationDataProvider');
  }
  return context;
};