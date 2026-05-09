import ImageKit from "imagekit-javascript";

import { supabase } from "./supabase";

const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;
const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;

if (!urlEndpoint || !publicKey) {
  console.warn("ImageKit configuration is missing. Please check your .env file.");
}

// @ts-ignore - ImageKit types can be finicky in some versions
export const imagekit = new ImageKit({
  urlEndpoint: urlEndpoint || "",
  publicKey: publicKey || "",
});

/**
 * Uploads a file to ImageKit
 * @param file The file to upload
 * @param fileName Optional fileName
 * @param folder Optional folder name
 * @returns Promise with the upload result including fileId for future deletions
 */
export const uploadToImageKit = async (
  file: File | Blob,
  fileName: string,
  folder: string = "uploads"
): Promise<{ url: string; fileId: string }> => {
  // 1. Manually fetch authentication parameters from Supabase Edge Function
  // This ensures the Supabase JWT is passed and permissions are verified
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.warn("No active Supabase session found. ImageKit auth might fail if function requires JWT.");
  }

  const { data: authData, error: authError } = await supabase.functions.invoke('imagekit-api', {
    method: 'GET'
  });

  if (authError || !authData) {
    console.error("ImageKit Auth failed. Error details:", authError);
    if (authError instanceof Error && (authError as any).context) {
        const context = (authError as any).context;
        console.error("Response context:", context);
        if (context.status === 401) {
            console.error("401 Unauthorized: The Supabase Edge Function is rejecting your request. Try redeploying with --no-verify-jwt or check your RLS/permissions.");
        }
    }
    throw new Error("Failed to authenticate with storage server. Check console for details.");
  }

  const { token, expire, signature } = authData;

  return new Promise((resolve, reject) => {
    imagekit.upload(
      {
        // @ts-ignore
        file,
        fileName,
        folder,
        useUniqueFileName: true,
        // @ts-ignore
        token,
        // @ts-ignore
        expire,
        // @ts-ignore
        signature
      },
      (err, result) => {
        if (err) {
          console.error("ImageKit upload error:", err);
          reject(err);
        } else {
          resolve({
            url: result?.url || "",
            fileId: result?.fileId || "",
          });
        }
      }
    );
  });
};

/**
 * Securely deletes a file from ImageKit via the Backend API
 * @param fileId The unique ID of the file to delete
 * @returns Promise with the deletion result
 */
export const deleteFromImageKit = async (fileId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('imagekit-api', {
      method: "POST",
      body: { fileId },
    });
    
    if (error) throw error;
    return data?.success === true;
  } catch (error) {
    console.error("ImageKit deletion error:", error);
    return false;
  }
};

