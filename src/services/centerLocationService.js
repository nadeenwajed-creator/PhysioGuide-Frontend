import { centerLocationService } from './auth/centerLocation.js';
export { validCoordinates } from './center/remainingOperations.js';

// Registration owns permission errors; settings also needs accuracy for confirmation.
export async function locateCenterDevice(geolocation = globalThis.navigator?.geolocation) {
  let accuracy = null;
  const provider = geolocation && {
    getCurrentPosition(success, error, options) {
      geolocation.getCurrentPosition(position => {
        accuracy = position.coords.accuracy;
        success(position);
      }, error, options);
    },
  };
  const coordinates = await centerLocationService.getCoordinates(provider);
  return { coordinates, accuracy };
}
export const lookupCenterAddress = (coordinates, options) => centerLocationService.getAddress(coordinates, options);

export function centerMapLinks(coordinates) {
  const { latitude, longitude } = coordinates;
  const box = [Math.max(-180, longitude - .006), Math.max(-90, latitude - .004), Math.min(180, longitude + .006), Math.min(90, latitude + .004)].join(',');
  return {
    page: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`,
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(box)}&layer=mapnik&marker=${latitude}%2C${longitude}`,
  };
}
