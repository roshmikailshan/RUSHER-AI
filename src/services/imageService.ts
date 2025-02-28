import axios from 'axios';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { auth } from '../config/firebase';

const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN;
const dbFirestore = getFirestore();

interface GenerateImageParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  num_outputs?: number;
  scheduler?: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  prompt_strength?: number;
  seed?: number;
  loras?: Array<{ path: string; scale: number }>;
}

interface ImageGenerationResponse {
  id: string;
  status: string;
  urls?: string[];
  error?: string;
}

export const generateImage = async (params: GenerateImageParams): Promise<ImageGenerationResponse> => {
  try {
    if (!REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token is not configured');
    }

    // Format LoRA parameters for the API
    const hf_loras = params.loras?.map(lora => lora.path) || [];
    const lora_scales = params.loras?.map(lora => lora.scale) || [];

    const response = await axios.post('/api/replicate/predictions', {
      version: "2389224e115448d9a77c07d7d45672b3f0aa45acacf1c5bcf51857ac295e3aec",
      input: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt,
        width: params.width || 512,
        height: params.height || 512,
        num_outputs: params.num_outputs || 1,
        scheduler: params.scheduler || "DPMSolverMultistep",
        num_inference_steps: params.num_inference_steps || 20,
        guidance_scale: params.guidance_scale || 7.5,
        hf_loras,
        lora_scales,
        disable_safety_checker: true
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${REPLICATE_API_TOKEN}`
      }
    });

    if (response.status === 402) {
      throw new Error('Your Replicate account requires payment or has insufficient credits. Please check your account at https://replicate.com');
    }

    if (!response.data) {
      throw new Error('No data received from image generation API');
    }

    return {
      id: response.data.id,
      status: response.data.status,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 402) {
        throw new Error('Your Replicate account requires payment or has insufficient credits. Please visit https://replicate.com to check your account status.');
      }
      throw new Error(`Error generating image: ${error.response?.data?.error || error.message}`);
    }
    throw error;
  }
};

export const checkGenerationStatus = async (id: string): Promise<ImageGenerationResponse> => {
  try {
    const response = await axios.get(`/api/replicate/predictions/${id}`);

    return {
      id: response.data.id,
      status: response.data.status,
      urls: response.data.output,
      error: response.data.error
    };
  } catch (error) {
    console.error('Error checking generation status:', error);
    throw error;
  }
};

export interface GenerationHistory {
  id: string;
  prompt: string;
  images: string[];
  settings: {
    model: string;
    numImages: number;
    width: number;
    height: number;
    guidanceScale: number;
    steps: number;
    seed?: string;
    loras: Array<{
      path: string;
      scale: number;
    }>;
  };
  createdAt: Date;
}

export const saveToCloudinary = async (imageUrl: string): Promise<string> => {
  try {
    const formData = new FormData();
    formData.append('file', imageUrl);
    formData.append('upload_preset', 'ml_default');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();
    return data.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

export const saveGenerationHistory = async (
  prompt: string,
  images: string[],
  settings: GenerationHistory['settings']
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  try {
    // Upload images to Cloudinary first
    const cloudinaryUrls = await Promise.all(
      images.map(async (img) => {
        try {
          const formData = new FormData();
          formData.append('file', img);
          formData.append('upload_preset', 'ml_default');

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
              method: 'POST',
              body: formData,
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to upload to Cloudinary: ${response.statusText}`);
          }

          const data = await response.json();
          return data.secure_url;
        } catch (error) {
          console.error('Error uploading to Cloudinary:', error);
          return img; // Fallback to original URL if upload fails
        }
      })
    );

    // Save to Firestore with the Cloudinary URLs
    const historyRef = collection(dbFirestore, 'users', user.uid, 'history');
    const docRef = await addDoc(historyRef, {
      prompt,
      images: cloudinaryUrls,
      settings,
      createdAt: serverTimestamp(),
      userId: user.uid
    });

    return docRef.id;
  } catch (error) {
    console.error('Error saving generation history:', error);
    throw error;
  }
};

export const getGenerationHistory = async (limitCount = 10): Promise<GenerationHistory[]> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const historyRef = collection(dbFirestore, 'users', user.uid, 'history');
  const q = query(historyRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as GenerationHistory[];
};

export const deleteGenerationHistory = async (historyId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  try {
    // Get the history item first to get the image URLs
    const historyRef = collection(dbFirestore, 'users', user.uid, 'history');
    const docRef = doc(historyRef, historyId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('History item not found');
    }

    const historyData = docSnap.data();

    // Delete images from Cloudinary
    if (historyData.images && Array.isArray(historyData.images)) {
      await Promise.all(
        historyData.images.map(async (imageUrl: string) => {
          try {
            // Extract public_id from Cloudinary URL
            const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
            const response = await fetch('/api/cloudinary/delete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ public_id: publicId }),
            });

            if (!response.ok) {
              console.error('Failed to delete image from Cloudinary:', publicId);
            }
          } catch (error) {
            console.error('Error deleting image from Cloudinary:', error);
          }
        })
      );
    }

    // Delete the document from Firestore
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting generation history:', error);
    throw error;
  }
};

export type { ImageGenerationResponse, GenerateImageParams }; 