'use client';
import { useState, useRef } from "react";

export default function Home() {
  const [datasetType, setDatasetType] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-[#0a1633] via-[#10192b] to-black text-white font-sans relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-blue-800 opacity-30 rounded-full blur-3xl z-0" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-cyan-500 opacity-20 rounded-full blur-2xl z-0" />

      {/* Logo */}
      <div className="absolute left-8 top-8 z-10 select-none flex items-center" style={{fontFamily: 'serif'}}>
        <span className="text-5xl sm:text-6xl font-extrabold italic tracking-tight bg-gradient-to-r from-white via-blue-300 to-cyan-400 bg-clip-text text-transparent drop-shadow flex items-end">
          e<sup className="text-2xl sm:text-3xl align-super ml-1" style={{fontFamily: 'serif', verticalAlign: 'super', lineHeight: 1}}>x</sup>
        </span>
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 z-10">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-10 sm:p-14 flex flex-col items-center w-full max-w-2xl relative">
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 text-center tracking-tight bg-gradient-to-r from-white via-blue-200 to-cyan-400 bg-clip-text text-transparent drop-shadow-lg">
            Lovable for ML
          </h1>
          <p className="text-lg sm:text-xl font-medium text-center mb-10 max-w-xl text-white/80">
            No setup. No notebooks. Just prompt AI, run it in the cloud, and deploy it anywhere.
          </p>
          <form className="flex flex-col gap-8 w-full items-center">
            <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
              {/* Project Name */}
              <div className="flex flex-col items-start w-full sm:w-auto">
                <label className="mb-2 text-sm font-semibold text-white/70">Project name</label>
                <input type="text" placeholder="" className="rounded-xl bg-white/10 border border-white/10 text-white px-4 py-3 w-48 outline-none focus:ring-2 focus:ring-cyan-400/60 transition placeholder-white/40" />
              </div>
              {/* Dataset Upload */}
              <div className="flex flex-col items-start w-full sm:w-auto">
                <label className="mb-2 text-sm font-semibold text-white/70">Dataset</label>
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold px-4 py-3 w-48 shadow-md hover:from-blue-700 hover:to-cyan-600 transition focus:outline-none focus:ring-2 focus:ring-cyan-400/60 flex items-center justify-center"
                >
                  {selectedFile ? 'Change file' : 'Upload dataset'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                {selectedFile && (
                  <span className="mt-2 text-xs text-cyan-300 truncate max-w-[11rem]">{selectedFile.name}</span>
                )}
              </div>
              {/* Dataset Type */}
              <div className="flex flex-col items-start w-full sm:w-auto">
                <label className="mb-2 text-sm font-semibold text-white/70">Dataset type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`rounded-full px-5 py-2 font-semibold border transition shadow-sm ${datasetType === 'text' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-transparent' : 'bg-white/10 text-white/60 border-white/10 hover:bg-white/20'}`}
                    onClick={() => setDatasetType('text')}
                  >
                    Text
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-5 py-2 font-semibold border transition shadow-sm ${datasetType === 'image' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-transparent' : 'bg-white/10 text-white/60 border-white/10 hover:bg-white/20'}`}
                    onClick={() => setDatasetType('image')}
                  >
                    Image
                  </button>
                </div>
              </div>
            </div>
            {/* Waitlist */}
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center mt-2">
              <input type="email" placeholder="johndoe@gmail.com" className="rounded-xl bg-white/10 border border-white/10 text-white px-4 py-3 w-full sm:w-80 outline-none focus:ring-2 focus:ring-cyan-400/60 transition placeholder-white/40" />
              <button type="submit" className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-full px-8 py-3 font-bold text-lg shadow-lg hover:from-blue-700 hover:to-cyan-600 transition w-full sm:w-auto">Join waitlist</button>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-sm text-white/50 py-6 z-10">
        <div className="w-full flex justify-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-4" />
        </div>
        2025 Exponent. All rights reserved.
      </footer>
    </div>
  );
}
