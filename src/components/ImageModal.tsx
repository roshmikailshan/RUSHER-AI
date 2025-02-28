import React from 'react';
import { FiX, FiDownload, FiCopy } from 'react-icons/fi';

interface ImageModalProps {
  imageUrl: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    window.open(imageUrl, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(imageUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="relative max-w-[90vw] max-h-[90vh]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Close modal"
        >
          <FiX size={24} />
        </button>

        {/* Image container */}
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Full size preview"
            className="rounded-lg max-w-full max-h-[85vh] object-contain"
          />

          {/* Action buttons */}
          <div className="absolute bottom-4 right-4 flex space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
              aria-label="Download image"
            >
              <FiDownload size={20} />
            </button>
            <button
              onClick={handleCopy}
              className="p-2 bg-gray-800 rounded-full text-gray-400 hover:text-white transition-colors"
              aria-label="Copy image URL"
            >
              <FiCopy size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 