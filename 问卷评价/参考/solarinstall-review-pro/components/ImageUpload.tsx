import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  images: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  label?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxFiles = 5,
  label = "Upload Images",
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const combined = [...images, ...newFiles].slice(0, maxFiles);
      onChange(combined);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={inputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          multiple
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-blue-500 transition-colors"
          disabled={images.length >= maxFiles}
        >
          <Upload className="w-5 h-5" />
          <span>{label}</span>
        </button>
        <span className="text-xs text-gray-400">
          {images.length}/{maxFiles}
        </span>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-2">
          {images.map((file, index) => (
            <div key={index} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-1 bg-white rounded-full text-red-500 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {images.length === 0 && (
        <div className="text-sm text-gray-400 italic flex items-center gap-1">
          <ImageIcon className="w-4 h-4" /> No images selected
        </div>
      )}
    </div>
  );
};