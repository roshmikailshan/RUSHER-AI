import { useState, useEffect, useRef } from 'react';
import { FiX, FiEdit2, FiPlus, FiLoader, FiCheck } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { 
  SavedLora,
  saveLora,
  updateLora,
  deleteLora,
  getUserLoras,
  CreateLoraInput
} from '../services/loraService';

interface SavedLoraProps {
  onSelectLora: (lora: SavedLora) => void;
  selectedLoras?: SavedLora[];
}

interface NewLoraFormData {
  name: string;
  hfPath: string;
  triggerWord: string;
  defaultScale: number;
  thumbnail?: string;
}

export const SavedLoraSection: React.FC<SavedLoraProps> = ({ onSelectLora, selectedLoras = [] }) => {
  const { user } = useAuth();
  const [savedLoras, setSavedLoras] = useState<SavedLora[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLora, setEditingLora] = useState<SavedLora | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLora, setNewLora] = useState<NewLoraFormData>({
    name: '',
    hfPath: '',
    triggerWord: '',
    defaultScale: 0.5
  });
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loraToDelete, setLoraToDelete] = useState<SavedLora | null>(null);

  // Load user's LoRAs from Firebase
  useEffect(() => {
    const loadLoras = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        const loras = await getUserLoras();
        setSavedLoras(loras);
      } catch (err) {
        console.error('Error loading LoRAs:', err);
        setError('Failed to load saved LoRAs. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadLoras();
  }, [user]);

  const handleSave = async () => {
    if (!user) {
      setError('Please sign in to save LoRAs');
      return;
    }

    if (!newLora.name || !newLora.hfPath || !newLora.triggerWord) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setError(null);
      setIsSaving(true);

      const loraInput: CreateLoraInput = {
        name: newLora.name.trim(),
        hfPath: newLora.hfPath.trim(),
        triggerWord: newLora.triggerWord.trim(),
        defaultScale: newLora.defaultScale,
        thumbnail: thumbnailUrl || undefined
      };

      if (editingLora) {
        // Update existing LoRA
        await updateLora(editingLora.id, loraInput);
        setSavedLoras(prev => prev.map(lora => 
          lora.id === editingLora.id ? { ...lora, ...loraInput } : lora
        ));
      } else {
        // Add new LoRA
        const newLoraId = await saveLora(loraInput);
        const savedLora: SavedLora = {
          ...loraInput,
          id: newLoraId,
          userId: '', // Will be set by the server
          createdAt: new Date() as any, // Will be set by the server
          updatedAt: new Date() as any // Will be set by the server
        };
        setSavedLoras(prev => [...prev, savedLora]);
      }

      // Reset form
      setNewLora({
        name: '',
        hfPath: '',
        triggerWord: '',
        defaultScale: 0.5,
        thumbnail: undefined
      });
      setThumbnailUrl('');
      setEditingLora(null);
    } catch (error) {
      console.error('Error saving LoRA:', error);
      setError(error instanceof Error ? error.message : 'Failed to save LoRA');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLora = async (id: string) => {
    if (!user) {
      setError('Please sign in to delete LoRAs');
      return;
    }

    try {
      setError(null);
      await deleteLora(id);
      setSavedLoras(prev => prev.filter(lora => lora.id !== id));
    } catch (err) {
      console.error('Error deleting LoRA:', err);
      setError('Failed to delete LoRA. Please try again.');
    }
  };

  const handleEditLora = (lora: SavedLora) => {
    setEditingLora(lora);
    setNewLora({
      name: lora.name,
      hfPath: lora.hfPath,
      triggerWord: lora.triggerWord,
      defaultScale: lora.defaultScale,
      thumbnail: lora.thumbnail
    });
    setThumbnailUrl(lora.thumbnail || '');
    setIsAddModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploadingImage(true);
      const previewUrl = URL.createObjectURL(file);
      setThumbnailUrl(previewUrl);
      setNewLora(prev => ({ ...prev, thumbnail: previewUrl }));
    } catch (error) {
      console.error('Error handling image:', error);
      setError('Failed to handle image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUrlInput = (url: string) => {
    setThumbnailUrl(url);
    setNewLora(prev => ({ ...prev, thumbnail: url }));
  };

  const handleDeleteClick = (lora: SavedLora, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoraToDelete(lora);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!loraToDelete) return;
    
    try {
      await handleDeleteLora(loraToDelete.id);
      setIsDeleteModalOpen(false);
      setLoraToDelete(null);
    } catch (error) {
      console.error('Error deleting LoRA:', error);
    }
  };

  // Helper function to check if a LoRA is selected
  const isLoraSelected = (loraId: string) => {
    return selectedLoras.some(l => l.id === loraId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <FiLoader className="animate-spin text-purple-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Saved LoRAs</h2>
          <p className="text-sm text-gray-400 mt-1">
            {selectedLoras.length} selected
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="p-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
          aria-label="Add new LoRA"
        >
          <FiPlus />
          <span className="text-sm">Add LoRA</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 text-red-200 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* LoRA Grid */}
      <div className="grid grid-cols-2 gap-4" role="list">
        {savedLoras.map(lora => {
          const isSelected = isLoraSelected(lora.id);
          return (
            <div
              key={lora.id}
              className={`relative group bg-gray-900/50 backdrop-blur-sm rounded-lg overflow-hidden cursor-pointer ${
                isSelected 
                  ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20' 
                  : 'hover:ring-1 hover:ring-gray-600'
              }`}
              role="listitem"
              onClick={() => onSelectLora(lora)}
            >
              {/* Main content area */}
              <div className="aspect-square">
                {lora.thumbnail ? (
                  <img
                    src={lora.thumbnail}
                    alt={lora.name}
                    className={`w-full h-full object-cover ${
                      isSelected ? 'opacity-75' : 'opacity-100 group-hover:opacity-90'
                    }`}
                  />
                ) : (
                  <div className={`w-full h-full bg-gray-800 flex flex-col items-center justify-center p-4 ${
                    isSelected ? 'opacity-75' : 'group-hover:opacity-90'
                  }`}>
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-3">
                      <span className="text-2xl font-bold text-gray-400">{lora.name[0].toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-gray-300 text-center truncate w-full font-medium">
                      {lora.name}
                    </span>
                  </div>
                )}

                {/* Selection overlay */}
                <div className={`absolute inset-0 bg-black transition-opacity duration-200 ${
                  isSelected ? 'bg-opacity-30' : 'bg-opacity-0 group-hover:bg-opacity-20'
                }`} />
              </div>

              {/* Selection indicator */}
              <div className={`absolute top-2 left-2 bg-purple-500 rounded-full p-1.5 shadow-lg z-10 transition-all duration-200 ${
                isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}>
                <FiCheck className="text-white" size={14} />
              </div>

              {/* Action buttons container */}
              <div className="absolute top-2 right-2 flex space-x-2 z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditLora(lora);
                  }}
                  className="p-1.5 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 transition-colors"
                  aria-label={`Edit ${lora.name}`}
                >
                  <FiEdit2 size={14} className="text-white" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(lora, e);
                  }}
                  className="p-1.5 bg-black/30 backdrop-blur-sm rounded-full hover:bg-black/50 transition-colors"
                  aria-label={`Delete ${lora.name}`}
                >
                  <FiX size={14} className="text-white" />
                </button>
              </div>

              {/* Info section */}
              <div className={`absolute bottom-0 left-0 right-0 p-3 bg-black/80 backdrop-blur-sm transform transition-transform duration-200 ${
                isSelected || lora.thumbnail ? 'translate-y-0' : 'translate-y-full group-hover:translate-y-0'
              }`}>
                <p className="text-sm font-medium truncate text-white">{lora.name}</p>
                <p className="text-xs text-gray-300 truncate mt-0.5">
                  Scale: <span className="text-purple-400">{lora.defaultScale}</span>
                </p>
                {lora.triggerWord && (
                  <p className="text-xs text-gray-300 truncate mt-0.5">
                    Trigger: <span className="text-purple-400">{lora.triggerWord}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {savedLoras.length === 0 && !isLoading && (
        <div className="text-center py-8 bg-gray-800/50 rounded-lg">
          <p className="text-gray-400">No LoRAs saved yet</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors text-sm inline-flex items-center gap-2"
          >
            <FiPlus size={16} />
            Add your first LoRA
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingLora ? 'Edit LoRA' : 'Add New LoRA'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingLora(null);
                  setNewLora({
                    name: '',
                    hfPath: '',
                    triggerWord: '',
                    defaultScale: 0.5
                  });
                }}
                className="text-gray-400 hover:text-white"
                aria-label="Close modal"
                title="Close modal"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-900/50 text-red-200 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Lora Name
                </label>
                <input
                  type="text"
                  value={newLora.name}
                  onChange={(e) => setNewLora(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter LoRA name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  HF Lora Path
                </label>
                <input
                  type="text"
                  value={newLora.hfPath}
                  onChange={(e) => setNewLora(prev => ({ ...prev, hfPath: e.target.value }))}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter HF LoRA path"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Trigger Word
                </label>
                <input
                  type="text"
                  value={newLora.triggerWord}
                  onChange={(e) => setNewLora(prev => ({ ...prev, triggerWord: e.target.value }))}
                  className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                  placeholder="Enter trigger word"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Default Scale
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={newLora.defaultScale}
                  onChange={(e) => setNewLora(prev => ({ ...prev, defaultScale: parseFloat(e.target.value) }))}
                  className="w-full"
                  aria-label="Default scale"
                  title="Default scale"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>0</span>
                  <span>{newLora.defaultScale?.toFixed(2)}</span>
                  <span>1</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Thumbnail Image
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => handleImageUrlInput(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white"
                    placeholder="Enter image URL or paste from clipboard"
                  />
                  
                  <div className="flex items-center">
                    <div className="flex-1 h-px bg-gray-600"></div>
                    <span className="px-3 text-sm text-gray-400">or</span>
                    <div className="flex-1 h-px bg-gray-600"></div>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-32 bg-gray-700 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-gray-600 cursor-pointer hover:border-purple-500 transition-colors relative ${
                      thumbnailUrl ? 'p-0' : 'p-4'
                    }`}
                  >
                    {thumbnailUrl ? (
                      <>
                        <img
                          src={thumbnailUrl}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                          <span className="text-white text-sm">Click to change image</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                          aria-label="Upload thumbnail image"
                        />
                        {isUploadingImage ? (
                          <FiLoader className="animate-spin text-purple-500" size={24} />
                        ) : (
                          <>
                            <div className="text-purple-500 mb-2">
                              <FiPlus size={24} />
                            </div>
                            <span className="text-gray-400 text-center text-sm">
                              Click to upload image<br />
                              <span className="text-xs text-gray-500">or paste URL above</span>
                            </span>
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {thumbnailUrl && (
                    <button
                      onClick={() => {
                        setThumbnailUrl('');
                        setNewLora(prev => ({ ...prev, thumbnail: undefined }));
                      }}
                      className="text-sm text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    >
                      <FiX size={14} />
                      <span>Remove image</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`w-full py-2 rounded-lg transition-colors ${
                  isSaving 
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-purple-500 hover:bg-purple-600'
                } flex items-center justify-center gap-2`}
              >
                {isSaving ? (
                  <FiLoader className="animate-spin" />
                ) : (
                  <>
                    {editingLora ? <FiEdit2 size={16} /> : <FiPlus size={16} />}
                    <span>{editingLora ? 'Save Changes' : 'Add LoRA'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && loraToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Delete LoRA</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "{loraToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setLoraToDelete(null);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 