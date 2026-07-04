import type { PublicRoleId } from '@/data/landingPlatformData';

/** Duración visible de cada clip en el carrusel (ms) */
export const ROLE_VIDEO_CLIP_MS = 3000;

const videosFolder = (files: number[]) =>
  files.map((n) => `/videos/${n}.mp4`);

/** Clips del rol Cliente — carpeta public/videos */
export const ROLE_CLIENT_VIDEOS = videosFolder([0, 1, 2, 3, 4, 5, 6, 7, 8]);

/** Clips del rol Proveedor — misma carpeta hasta tener videos dedicados */
export const ROLE_PROVIDER_VIDEOS = ROLE_CLIENT_VIDEOS;

/** Clips del rol Refugio — misma carpeta hasta tener videos dedicados */
export const ROLE_SHELTER_VIDEOS = ROLE_CLIENT_VIDEOS;

export const roleVideos: Record<PublicRoleId, readonly string[]> = {
  client: ROLE_CLIENT_VIDEOS,
  provider: ROLE_PROVIDER_VIDEOS,
  shelter: ROLE_SHELTER_VIDEOS,
};
