import { 
  getFirestore, 
  collection, 
  doc, 
  deleteDoc, 
  getDocs, 
  query,
  serverTimestamp,
  Timestamp,
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { auth } from '../config/firebase';

const dbFirestore = getFirestore();

// Interface for creating a new LoRA
export interface CreateLoraInput {
  name: string;
  hfPath: string;
  triggerWord: string;
  defaultScale: number;
  thumbnail?: string;
}

// Interface for a saved LoRA with all fields
export interface SavedLora extends CreateLoraInput {
  id: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const saveLora = async (input: CreateLoraInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const userLorasRef = collection(dbFirestore, 'users', user.uid, 'loras');
  const docRef = await addDoc(userLorasRef, {
    ...input,
    userId: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateLora = async (loraId: string, updates: Partial<CreateLoraInput>): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const loraRef = doc(dbFirestore, 'users', user.uid, 'loras', loraId);
  await updateDoc(loraRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
};

export const deleteLora = async (loraId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const loraRef = doc(dbFirestore, 'users', user.uid, 'loras', loraId);
  await deleteDoc(loraRef);
};

export const getUserLoras = async (): Promise<SavedLora[]> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated');

  const userLorasRef = collection(dbFirestore, 'users', user.uid, 'loras');
  const q = query(userLorasRef);
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SavedLora));
}; 