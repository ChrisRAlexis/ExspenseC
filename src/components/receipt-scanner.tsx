'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, RotateCcw, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OCRResult } from '@/types';

interface ReceiptScannerProps {
  onComplete: (data: OCRResult) => void;
  onCancel: () => void;
  onUpload: (file: File, preview: string) => void;
  onScanAnother?: () => void;
}

export function ReceiptScanner({ onComplete, onCancel, onUpload }: ReceiptScannerProps) {
  const [mode, setMode] = useState<'select' | 'camera' | 'preview' | 'processing' | 'success'>('select');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode('camera');
    } catch (err) {
      setError('Unable to access camera. Please try uploading a file instead.');
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
          setImageFile(file);
          setPreview(canvas.toDataURL('image/jpeg'));
          stopCamera();
          setMode('preview');
        }
      }, 'image/jpeg', 0.95);
    }
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
        setMode('preview');
      };
      reader.readAsDataURL(file);
    }
  }

  async function processImage() {
    if (!imageFile) return;

    setMode('processing');
    setProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 85));
      }, 300);

      // Use server-side Google Cloud Vision API
      const formData = new FormData();
      formData.append('file', imageFile);

      const response = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OCR processing failed');
      }

      const { data } = await response.json();
      setProgress(100);
      setOcrResult(data);

      // Save the receipt
      onUpload(imageFile, preview!);

      // Show success mode with option to scan another
      setTimeout(() => {
        onComplete(data);
        setMode('success');
      }, 500);
    } catch (err: any) {
      console.error('OCR Error:', err);
      setError(err.message || 'Failed to process receipt. Please try again.');
      setMode('preview');
    }
  }

  function reset() {
    setImageFile(null);
    setPreview(null);
    setOcrResult(null);
    setError(null);
    setProgress(0);
    stopCamera();
    setMode('select');
  }

  function handleCancel() {
    stopCamera();
    onCancel();
  }

  // Select mode - choose camera or upload
  if (mode === 'select') {
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={startCamera}
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Camera className="h-8 w-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Take Photo</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Upload className="h-8 w-8 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Upload File</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        <Button type="button" variant="ghost" onClick={handleCancel} className="w-full">
          Cancel
        </Button>
      </div>
    );
  }

  // Camera mode
  if (mode === 'camera') {
    return (
      <div className="space-y-4">
        <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-8 border-2 border-white/50 rounded-lg" />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button type="button" onClick={capturePhoto} className="flex-1">
            <Camera className="h-4 w-4 mr-2" />
            Capture
          </Button>
        </div>
      </div>
    );
  }

  // Preview mode
  if (mode === 'preview' && preview) {
    return (
      <div className="space-y-4">
        <div className="relative aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden">
          <img src={preview} alt="Receipt" className="w-full h-full object-contain" />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={reset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Retake
          </Button>
          <Button type="button" onClick={processImage} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Scan Receipt
          </Button>
        </div>
      </div>
    );
  }

  // Processing mode
  if (mode === 'processing') {
    return (
      <div className="space-y-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
            <Sparkles className="h-4 w-4 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-600">Scanning with Google Cloud Vision</p>
            <p className="text-xs text-slate-400 mt-1">AI-powered receipt analysis</p>
          </div>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-primary-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-xs text-center text-slate-500">
          Extracting vendor, date, items, and total
        </p>
      </div>
    );
  }

  // Success mode - show results and option to scan another
  if (mode === 'success' && ocrResult) {
    const itemCount = ocrResult.items?.length || 0;
    return (
      <div className="space-y-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-full">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-800">Receipt Scanned!</p>
              <p className="text-sm text-green-600">
                {itemCount} item{itemCount !== 1 ? 's' : ''} extracted
                {ocrResult.totalAmount && ` • $${ocrResult.totalAmount.toFixed(2)}`}
              </p>
            </div>
          </div>

          {ocrResult.vendorName && (
            <p className="text-sm text-slate-600">
              <span className="text-slate-400">Vendor:</span> {ocrResult.vendorName}
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={reset} className="flex-1">
            <Camera className="h-4 w-4 mr-2" />
            Scan Another
          </Button>
          <Button type="button" onClick={onCancel} className="flex-1">
            <Check className="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
