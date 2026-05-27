import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DetectionOverlay } from '@/components/hazard/DetectionOverlay';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { UploadCloud, Mic, MapPin, CheckCircle, MicOff, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const Report = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);
  
  const { coords, getLocation, loading: locLoading } = useGeolocation();
  const { isRecording, transcript, startRecording, stopRecording, setTranscript } = useVoiceRecorder();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = () => {
    toast.success('Hazard reported successfully! You earned 50 points.');
    navigate('/dashboard');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Report a Hazard</h1>
        
        <div className="flex items-center justify-between mt-6 relative">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center w-1/4 relative z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${step >= i ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-secondary text-muted-foreground'}`}>
                {step > i ? <CheckCircle className="w-5 h-5" /> : i}
              </div>
              <div className={`text-xs mt-2 hidden sm:block ${step >= i ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {i === 1 ? 'Upload' : i === 2 ? 'AI Scan' : i === 3 ? 'Details' : 'Submit'}
              </div>
            </div>
          ))}
          <div className="absolute top-4 left-0 w-full h-[2px] bg-secondary -z-0">
             <div className="h-full bg-primary transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }} />
          </div>
        </div>
      </div>

      <Card className="min-h-[400px]">
        <CardContent className="p-6">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="border-2 border-dashed border-primary/50 rounded-xl p-12 flex flex-col items-center justify-center bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer relative overflow-hidden group">
                <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={handleImageUpload} />
                {image ? (
                  <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-10 transition-opacity" />
                ) : null}
                <UploadCloud className="w-16 h-16 text-primary mb-4 z-10" />
                <h3 className="font-bold text-lg z-10">Tap to Capture or Upload</h3>
                <p className="text-sm text-muted-foreground mt-2 text-center z-10">Take a photo of the hazard. Make sure it's clear.</p>
                {image && <p className="text-green-500 font-bold mt-4 z-10 flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Image Ready</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Voice Description (Optional)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button 
                    type="button" 
                    variant={isRecording ? "destructive" : "secondary"} 
                    onClick={isRecording ? stopRecording : startRecording}
                    className="w-full sm:w-auto"
                  >
                    {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                    {isRecording ? 'Stop Recording' : 'Hold to Speak'}
                  </Button>
                  {isRecording && (
                    <div className="flex gap-1 h-8 items-center px-4 bg-destructive/10 rounded-full w-full sm:w-auto justify-center">
                      {[1,2,3,4,5,6,7,8].map(bar => (
                        <motion.div key={bar} animate={{ height: ['4px', '24px', '4px'] }} transition={{ repeat: Infinity, duration: Math.random() * 0.5 + 0.3 }} className="w-1 bg-destructive rounded-full" />
                      ))}
                    </div>
                  )}
                </div>
                <Input 
                  placeholder="Or type a description..." 
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Button className="w-full h-12 text-lg mt-8" disabled={!image} onClick={handleNext}>Analyze with AI</Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <DetectionOverlay imageUrl={image} onAnalysisComplete={setAiResult} />
              
              {aiResult && (
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg space-y-2">
                  <h3 className="font-bold text-destructive flex items-center"><ShieldAlert className="mr-2 h-5 w-5" /> Critical Hazard Detected</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                    <div><span className="text-muted-foreground">Type:</span> <span className="font-bold capitalize block">{aiResult.type}</span></div>
                    <div><span className="text-muted-foreground">Confidence:</span> <span className="font-bold block">{aiResult.confidence}%</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Severity Score:</span> <span className="font-bold text-destructive text-xl block">{aiResult.severity} / 10</span></div>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={handlePrev} className="w-1/3">Back</Button>
                <Button onClick={handleNext} disabled={!aiResult} className="w-2/3">Confirm Detection</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="p-8 border rounded-lg bg-card text-center space-y-6 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-xl">Where is the hazard?</h3>
                  <p className="text-muted-foreground text-sm mt-2">We need the exact location to dispatch repair teams to the right place.</p>
                </div>
                
                <Button onClick={getLocation} disabled={locLoading} size="lg" className="w-full sm:w-auto">
                  {locLoading ? 'Fetching GPS Coordinates...' : 'Use Current GPS Location'}
                </Button>

                {coords && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-secondary/30 rounded-md w-full border border-secondary">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Location Acquired:</p>
                    <p className="font-mono font-bold text-lg text-primary">{coords.lat.toFixed(5)}°, {coords.lng.toFixed(5)}°</p>
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={handlePrev} className="w-1/3">Back</Button>
                <Button onClick={handleNext} disabled={!coords} className="w-2/3">Review Submission</Button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-6 border rounded-lg p-6 bg-card">
                <div className="flex items-center gap-4 border-b pb-4">
                  {image && <img src={image} className="w-20 h-20 rounded object-cover" />}
                  <div>
                    <h3 className="font-bold text-xl">Submission Summary</h3>
                    <p className="text-sm text-muted-foreground">Review details before sending to authorities.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Hazard Type</p>
                    <p className="font-bold capitalize text-lg">{aiResult?.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Severity</p>
                    <p className="font-bold text-destructive text-lg">{aiResult?.severity} / 10</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Coordinates</p>
                    <p className="font-mono">{coords?.lat.toFixed(5)}, {coords?.lng.toFixed(5)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="bg-secondary/20 p-3 rounded-md mt-1">{transcript || 'No verbal description provided'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={handlePrev} className="w-1/3">Edit</Button>
                <Button onClick={handleSubmit} className="w-2/3 bg-green-600 hover:bg-green-700 text-white h-12 text-lg">
                  Submit Report
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
