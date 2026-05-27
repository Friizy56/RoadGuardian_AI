import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScanSearch, ShieldAlert } from 'lucide-react';

interface DetectionOverlayProps {
  imageUrl: string | null;
  onAnalysisComplete: (results: any) => void;
}

export const DetectionOverlay = ({ imageUrl, onAnalysisComplete }: DetectionOverlayProps) => {
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    if (!imageUrl) return;
    
    // Simulate AI analysis delay
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
      onAnalysisComplete({
        severity: 8.5,
        type: 'pothole',
        confidence: 94
      });
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [imageUrl, onAnalysisComplete]);

  if (!imageUrl) return null;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-lg overflow-hidden border bg-black aspect-video flex items-center justify-center">
      <img src={imageUrl} alt="Uploaded hazard" className="w-full h-full object-cover opacity-60" />
      
      {isAnalyzing ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <ScanSearch className="w-16 h-16 text-primary mb-4" />
          </motion.div>
          <h3 className="text-xl font-bold text-primary animate-pulse">Running AI Analysis...</h3>
          <p className="text-sm text-muted-foreground mt-2">Detecting hazards & calculating severity</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-10 pointer-events-none"
        >
          {/* Mock Bounding Box */}
          <motion.div 
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.5 }}
            className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border-4 border-destructive bg-destructive/20 rounded"
          >
            <div className="absolute -top-8 left-[-4px] bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 flex items-center rounded-t shadow-lg">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Pothole (94%)
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
