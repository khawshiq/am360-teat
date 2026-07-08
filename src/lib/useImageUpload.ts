"use client";
import { useState } from "react";
import { uploadImage } from "./client";

export function useImageUpload(folder: string) {
  const [uploading, setUploading] = useState(false);
  const onFileChange = async (e: any, onSuccess: (url: string) => void, onError: (msg: string) => void) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true); onError("");
    try { onSuccess(await uploadImage(f, folder)); }
    catch (err: any) { onError("Photo upload failed: " + err.message); }
    finally { setUploading(false); }
  };
  return { uploading, onFileChange };
}
