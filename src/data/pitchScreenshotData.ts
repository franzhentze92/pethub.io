export const PITCH_PROVIDER_SCREENSHOTS = Array.from(
  { length: 6 },
  (_, i) => `/screenshots2/proveedor${i + 1}.png`,
);

/** albergue3.png no está en el folder — se omiten huecos en la numeración */
export const PITCH_SHELTER_SCREENSHOTS = [1, 2, 4, 5, 6].map(
  (n) => `/screenshots2/albergue${n}.png`,
);
