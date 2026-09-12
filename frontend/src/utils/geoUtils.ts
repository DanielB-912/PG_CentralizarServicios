import axios from 'axios';

// Debounce helper
let timeoutId: ReturnType<typeof setTimeout>;

export const reverseGeocode = async (lat: number, lng: number): Promise<{ direccion: string, macrodistrito: string } | null> => {
  return new Promise((resolve) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(async () => {
      try {
        const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`);
        const addr = res.data.address;
        
        if (addr) {
          const street = addr.road || addr.pedestrian || addr.neighbourhood || addr.suburb || addr.city || "Ubicación seleccionada";
          
          const locationStr = JSON.stringify(addr).toLowerCase();
          let macrodistrito = 'Centro';
          if (locationStr.includes('cala cala') || locationStr.includes('querú querú') || locationStr.includes('aranjuez')) {
            macrodistrito = 'Cala Cala';
          } else if (locationStr.includes('sud') || locationStr.includes('jaihuayco') || locationStr.includes('valle hermoso') || locationStr.includes('alalay')) {
            macrodistrito = 'Sud';
          } else if (locationStr.includes('sacaba') || locationStr.includes('huayllani') || locationStr.includes('quintanilla')) {
            macrodistrito = 'Sacaba';
          } else if (locationStr.includes('quillacollo') || locationStr.includes('colcapirhua') || locationStr.includes('tiquipaya')) {
            macrodistrito = 'Quillacollo';
          }

          resolve({ direccion: street, macrodistrito });
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error("Error in reverse geocoding:", error);
        resolve(null);
      }
    }, 400); // 400ms debounce
  });
};
