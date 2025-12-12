import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (content: string) => void;
  error?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, error }) => {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [onUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert('Please upload a valid CSV file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      onUpload(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`relative group flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out cursor-pointer
          ${error 
            ? 'border-red-300 bg-red-50 hover:bg-red-100' 
            : 'border-slate-300 bg-white hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-lg'
          }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
          {error ? (
            <AlertCircle className="w-12 h-12 mb-3 text-red-500" />
          ) : (
            <div className="p-4 bg-indigo-100 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload className="w-8 h-8 text-indigo-600" />
            </div>
          )}
          
          <p className="mb-2 text-lg font-medium text-slate-700">
            {error ? 'Upload Failed' : 'Drop your employee CSV here'}
          </p>
          <p className="text-sm text-slate-500">
            {error ? error : 'or click to browse from your computer'}
          </p>
        </div>
        
        <input 
          id="dropzone-file" 
          type="file" 
          accept=".csv"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          onChange={handleFileChange}
        />
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
        <FileText className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Expected CSV Format:</p>
          <code className="bg-white px-2 py-1 rounded border border-blue-200 block mt-1 font-mono text-xs">
            EMPLOYEENUMBER,SUPERVISORPARTYID,FIRSTNAME
          </code>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
