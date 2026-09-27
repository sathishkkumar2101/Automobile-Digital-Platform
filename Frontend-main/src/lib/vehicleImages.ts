/**
 * Maps BMW model names to their local image paths.
 * Images are served from /vehicles/ (Vite public directory).
 * Each image is an authentic photo of the correct BMW model.
 */

const MODEL_IMAGE_MAP: Record<string, string> = {
  'BMW 2 Series': '/vehicles/bmw-2-series.jpg',
  'BMW 3 Series': '/vehicles/bmw-3-series.jpg',
  'BMW 4 Series': '/vehicles/bmw-4-series.jpg',
  'BMW 5 Series': '/vehicles/bmw-5-series.jpg',
  'BMW 7 Series': '/vehicles/bmw-7-series.jpg',
  'BMW X1': '/vehicles/bmw-x1.jpg',
  'BMW X3': '/vehicles/bmw-x3.jpg',
  'BMW X5': '/vehicles/bmw-x5.jpg',
  'BMW X6': '/vehicles/bmw-x6.jpg',
  'BMW X7': '/vehicles/bmw-x7.jpg',
  'BMW iX1': '/vehicles/bmw-ix1.jpg',
  'BMW i5': '/vehicles/bmw-i5.jpg',
  'BMW i7': '/vehicles/bmw-i7.jpg',
  'BMW M2': '/vehicles/bmw-m2.jpg',
  'BMW M4': '/vehicles/bmw-m4.jpg',
};

/**
 * Returns the local image path for a given vehicle model name.
 * Falls back to a generic BMW placeholder if no specific match is found.
 */
export function getVehicleImage(model: string | undefined): string {
  if (!model) return '/vehicles/bmw-3-series.jpg';
  
  // Direct match
  if (MODEL_IMAGE_MAP[model]) return MODEL_IMAGE_MAP[model];
  
  // Partial match (e.g., "BMW 3 Series" matches "BMW 3 Series Gran Limousine")
  for (const [key, path] of Object.entries(MODEL_IMAGE_MAP)) {
    if (model.includes(key) || key.includes(model)) return path;
  }
  
  // Fallback to BMW 3 Series as default
  return '/vehicles/bmw-3-series.jpg';
}

export default MODEL_IMAGE_MAP;
