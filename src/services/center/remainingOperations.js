export function createRemainingOperations({ requireCenter, fail }) {
  return {
    async changeCenterPassword(actor) {
      requireCenter(actor);
      fail('passwordUnavailable');
    },
  };
}

export function validCoordinates(value) {
  return Boolean(value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    && Math.abs(value.latitude) <= 90 && Math.abs(value.longitude) <= 180);
}

export function normalizeCenterExtras(values, fail) {
  const extras = {};
  if (Object.hasOwn(values, 'coordinates')) {
    if (values.coordinates !== null && (!validCoordinates(values.coordinates) || values.locationConfirmed !== true)) {
      fail('validation', { coordinates: 'confirmLocation' });
    }
    extras.coordinates = values.coordinates === null ? null : {
      latitude: values.coordinates.latitude, longitude: values.coordinates.longitude,
    };
    extras.locationConfirmed = values.coordinates !== null;
  }
  if (Object.hasOwn(values, 'gallery')) {
    if (!Array.isArray(values.gallery) || values.gallery.some(item => typeof item !== 'string' || !item.trim())) fail('image');
    extras.gallery = [...new Set(values.gallery)];
  }
  return extras;
}
