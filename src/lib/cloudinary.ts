// Inserts a Cloudinary delivery-time transformation into an existing secure_url,
// so thumbnails are resized/compressed without re-uploading or altering the stored URL.
export function cld(url: string | null | undefined, opts: { w?: number; h?: number; crop?: string; gravity?: string } = {}): string {
  if (!url) return "";
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const parts = ["q_auto", "f_auto"];
  if (opts.crop) parts.push(`c_${opts.crop}`);
  if (opts.w) parts.push(`w_${opts.w}`);
  if (opts.h) parts.push(`h_${opts.h}`);
  if (opts.gravity) parts.push(`g_${opts.gravity}`);
  return url.slice(0, idx + marker.length) + parts.join(",") + "/" + url.slice(idx + marker.length);
}
