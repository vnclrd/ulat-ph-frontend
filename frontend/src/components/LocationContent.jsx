import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import customPinImage from '/custom-pin.png';

// Default marker icon
delete L.Icon.Default.prototype._getIconUrl;
const customPinIcon = L.icon({
  iconUrl: customPinImage,
  iconSize: [60, 60],
  iconAnchor: [19, 38],
  popupAnchor: [0, -38],
});

// Preload tiles for faster rendering
const preloadTiles = (lat, lng, zoom = 13) => {
  const tileSize = 256;
  const numTiles = Math.pow(2, zoom);
  
  // Calculate tile coordinates
  const x = Math.floor((lng + 180) / 360 * numTiles);
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * numTiles);
  
  // Preload surrounding tiles
  const tilesToLoad = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      const tileX = x + dx;
      const tileY = y + dy;
      if (tileX >= 0 && tileX < numTiles && tileY >= 0 && tileY < numTiles) {
        tilesToLoad.push(`https://a.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`);
        tilesToLoad.push(`https://b.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`);
        tilesToLoad.push(`https://c.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`);
      }
    }
  }
  
  // Load tiles in background
  tilesToLoad.forEach(url => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
};

// Loading component
const MapLoader = () => (
  <div className='flex items-center justify-center w-full h-full'>
    <div className='flex flex-col items-center gap-4 text-[#e0e0e0]'>
      <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-white'></div>
      <p className='text-lg'>Loading map...</p>
    </div>
  </div>
);

// Improved MapResizer with better performance
function MapResizer({ center }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    let timeoutId;
    let tries = 0;
    const maxTries = 5;

    function refreshMap() {
      if (!map) return;

      try {
        map.invalidateSize();
        
        if (center) {
          map.setView(center, map.getZoom(), { 
            animate: true,
            duration: 0.5
          });
        }

        if (tries < maxTries) {
          tries++;
          timeoutId = setTimeout(refreshMap, 200);
        }
      } catch (error) {
        console.error('Map refresh error:', error);
      }
    }

    requestAnimationFrame(refreshMap);

    const handleResize = () => {
      clearTimeout(timeoutId);
      requestAnimationFrame(() => {
        if (map) {
          map.invalidateSize();
          if (center) map.setView(center, map.getZoom(), { animate: false });
        }
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestAnimationFrame(() => {
          if (map) {
            map.invalidateSize();
            if (center) map.setView(center, map.getZoom(), { animate: false });
          }
        });
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [map, center]);

  return null;
}

// Optimized Center button
function CenterButton({ markerPos, handleDetectLocation }) {
  const map = useMap();
  
  const handleCenter = () => {
    if (map && markerPos) {
      map.setView(markerPos, map.getZoom(), { 
        animate: true,
        duration: 0.5
      });
    }
  };

  return (
    <>
      <button
        onClick={handleCenter}
        className='absolute top-4 right-4 z-[1000] p-2 bg-white rounded-full shadow-lg border border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors duration-200'
      >
        <img 
          src='./target-icon.png' 
          alt='Target Icon' 
          className='w-[26px] h-auto'
          loading='lazy'
        />
      </button>
      <button
        onClick={handleDetectLocation}
        className='absolute top-4 right-16 z-[1000] p-2 bg-white rounded-full shadow-lg border cursor-pointer'
      >
        <img 
          src='./navigation-icon.png' 
          alt='Target Icon' 
          className='w-[26px] h-auto'
          loading='lazy'
        />
      </button>
    </>
  );
}

// Memoized Map Component for better performance
const OptimizedMap = ({ markerPos, currentZoom, handleDragEnd, locationName, markerRef, handleDetectLocation }) => (
  <MapContainer
    center={markerPos}
    zoom={currentZoom}
    style={{
      height: '100%',
      width: '100%',
      borderRadius: '20px',
    }}
    zoomControl={false}
    preferCanvas={true}
    updateWhenIdle={false}
    updateWhenZooming={false}
    keepInView={true}
    whenReady={(map) => {
      const center = map.target.getCenter();
      preloadTiles(center.lat, center.lng, currentZoom);
    }}
  >
    <TileLayer
      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OSM</a>"
      maxZoom={18}
      minZoom={10}
      keepBuffer={2}
      updateWhenIdle={false}
      updateWhenZooming={false}
      crossOrigin={true}
    />
    <Marker
      ref={markerRef}
      position={markerPos}
      draggable={true}
      eventHandlers={{
        dragend: handleDragEnd,
      }}
      icon={customPinIcon}
    >
      <Popup>
        {locationName || 'Drag marker to change location'}
      </Popup>
    </Marker>
    <MapResizer center={markerPos} />
    <CenterButton markerPos={markerPos} handleDetectLocation={handleDetectLocation} />
  </MapContainer>
);

export default function LocationContent({ location, setLocation }) {
  const [markerPos, setMarkerPos] = useState(
    location?.lat && location?.lng ? [location.lat, location.lng] : null
  );
  const [isMapReady, setIsMapReady] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(13);
  const [locationName, setLocationName] = useState(
    location?.name || 'Fetching your location...'
  );
  const [isDetecting, setIsDetecting] = useState(false);

  const lastValidPosition = useRef(null);
  const markerRef = useRef(null);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);

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
            setLocation({
              lat: latitude,
              lng: longitude,
              name: data.address
            });
            setMarkerPos([latitude, longitude]);
            setLocationName(data.address);
            lastValidPosition.current = [latitude, longitude];
          } else {
            alert(data.error || 'Failed to get address');
          }
        } catch (error) {
          console.error(error);
          alert('Failed to detect location. Please try again.');
        } finally {
          setIsDetecting(false);
        }
      },
      (error) => {
        console.error(error);
        setIsDetecting(false);
        alert('Unable to retrieve your location. Please check your browser permissions.');
      }
    );
  };

  useEffect(() => {
    let isMounted = true;

    const initializeLocation = async () => {
      if (location?.lat && location?.lng) {
        setMarkerPos([location.lat, location.lng]);
        setLocationName(location.name);
        lastValidPosition.current = [location.lat, location.lng];
        preloadTiles(location.lat, location.lng, 13);
        setIsMapReady(true);
      } else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              if (!isMounted) return;
              
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const position = [lat, lng];
              
              preloadTiles(lat, lng, 13);
              
              setMarkerPos(position);
              lastValidPosition.current = position;

              try {
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
                  {
                    signal: AbortSignal.timeout(5000)
                  }
                );
                
                if (!isMounted) return;
                
                const data = await res.json();
                const name = data.display_name || `Lat: ${lat}, Lng: ${lng}`;
                setLocationName(name);

                if (setLocation) {
                  setLocation({ lat, lng, name });
                }
                
                setIsMapReady(true);
              } catch (err) {
                if (!isMounted) return;
                console.error('Error fetching location name:', err);
                setLocationName(`Lat: ${lat}, Lng: ${lng}`);
                setIsMapReady(true);
              }
            },
            (err) => {
              if (!isMounted) return;
              console.error('Geolocation error:', err);
              setLocationName('Unable to fetch your location.');
              setIsMapReady(true);
            },
            {
              timeout: 10000,
              enableHighAccuracy: false,
              maximumAge: 60000
            }
          );
        } else {
          setLocationName('Geolocation is not supported by your browser.');
          setIsMapReady(true);
        }
      }
    };

    initializeLocation();

    return () => {
      isMounted = false;
    };
  }, [location, setLocation]);

  const handleDragEnd = async (e) => {
    const newLatLng = e.target.getLatLng();
    const newPosition = [newLatLng.lat, newLatLng.lng];

    try {
      preloadTiles(newLatLng.lat, newLatLng.lng, currentZoom);
      
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${newLatLng.lat}&lon=${newLatLng.lng}`,
        {
          signal: AbortSignal.timeout(3000)
        }
      );
      const data = await res.json();
      const name = data.display_name || `Lat: ${newLatLng.lat}, Lng: ${newLatLng.lng}`;

      const isValidLocation = name.toLowerCase().includes('metro manila');

      if (isValidLocation) {
        setMarkerPos(newPosition);
        setLocationName(name);
        lastValidPosition.current = newPosition;

        if (setLocation) {
          setLocation({
            lat: newLatLng.lat,
            lng: newLatLng.lng,
            name,
          });
        }
      } else {
        if (lastValidPosition.current) {
          setMarkerPos([...lastValidPosition.current]);
          if (markerRef.current) {
            markerRef.current.setLatLng(lastValidPosition.current);
          }
        }
        console.log('Invalid location: Must be within Metro Manila');
      }
    } catch (err) {
      console.error('Error fetching location name:', err);
      if (lastValidPosition.current) {
        setMarkerPos([...lastValidPosition.current]);
        if (markerRef.current) {
          markerRef.current.setLatLng(lastValidPosition.current);
        }
      }
    }
  };

  return (
    <div className='flex flex-col w-full h-full'>
      <div className='flex flex-col items-center justify-center mb-4 text-center'>
        <h1 className='text-[2rem] md:text-[2.5rem] font-bold'>Select Location</h1>
        <p className='text-sm text-[#e0e0e0] font-b'>
          Your current selected location is:
          <br />
          <span className='italic text-[#e0e0e0] text-lg'>{locationName}</span>
        </p>
      </div>
      <div className='relative w-full h-[600px] sm:h-[400px] md:h-[500px] rounded-[25px] overflow-hidden'>
        {isDetecting && (
          <div className='absolute inset-0 z-10 flex items-center justify-center bg-transparent'>
            <div className='flex flex-col items-center gap-4 text-white'>
              <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-white'></div>
              <p className='text-lg'>Finding location...</p>
            </div>
          </div>
        )}

        {/* Map */}
        <div className={`w-full h-full transition-opacity duration-300 ${isDetecting ? 'opacity-50' : 'opacity-100'}`}>
          {(isMapReady && markerPos) ? (
            <Suspense fallback={<MapLoader />}>
              <OptimizedMap
                markerPos={markerPos}
                currentZoom={currentZoom}
                handleDragEnd={handleDragEnd}
                locationName={locationName}
                markerRef={markerRef}
                handleDetectLocation={handleDetectLocation}
              />
            </Suspense>
          ) : (
            <MapLoader />
          )}
        </div>
      </div>
    </div>
  );
}