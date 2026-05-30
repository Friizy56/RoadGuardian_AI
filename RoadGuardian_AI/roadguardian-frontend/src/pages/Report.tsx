import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DetectionOverlay } from '@/components/hazard/DetectionOverlay';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { UploadCloud, Mic, MapPin, CheckCircle, MicOff, ShieldAlert, AlertTriangle, FileText, Globe, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { useReportStore } from '@/store/reportStore';
import { saveOfflineReport } from '@/utils/offlineSync';
import { v4 as uuidv4 } from 'uuid';

export const Report = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [image, setImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  
  const { coords, getLocation, loading: locLoading } = useGeolocation();
  const { isRecording, transcript, audioUrl, audioBlob, startRecording, stopRecording, setTranscript } = useVoiceRecorder();

  const [manualLocation, setManualLocation] = useState({
    state: '',
    district: '',
    locality: '',
    pincode: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    const locString = [manualLocation.locality, manualLocation.district, manualLocation.state].filter(Boolean).join(', ');
    
    // Default coords to a mock central location if GPS wasn't used
    const finalLat = coords ? coords.lat : 22.0;
    const finalLng = coords ? coords.lng : 79.0;
    const finalDescription = (locString ? `[Locality: ${locString}] ` : '') + (transcript || '');

    setIsSubmitting(true);
    let parsedType = 'other';
    try {
      if (aiResult?.type) {
        const t = aiResult.type.toLowerCase();
        if (t.includes('pothole')) parsedType = 'pothole';
        else if (t.includes('crack')) parsedType = 'crack';
        else if (t.includes('water') || t.includes('flood')) parsedType = 'waterlogging';
        else if (t.includes('divider') || t.includes('barrier')) parsedType = 'broken_dividers';
        else if (t.includes('sign') || t.includes('signage') || t.includes('board')) parsedType = 'missing_signs';
        else if (t.includes('street light') || t.includes('light fault')) parsedType = 'street_light_fault';
        else if (t.includes('manhole')) parsedType = 'manhole_defect';
        else if (t.includes('debris') || t.includes('obstruction')) parsedType = 'road_debris';
        else if (t.includes('pavement')) parsedType = 'pavement_defect';
      }

      const formData = new FormData();
      formData.append('latitude', String(finalLat));
      formData.append('longitude', String(finalLng));

      if (!navigator.onLine) {
        let savedOffline = true;

        if (imageFile) {
          savedOffline = await saveOfflineReport({
            id: uuidv4(),
            type: 'image',
            latitude: String(finalLat),
            longitude: String(finalLng),
            hazard_type: parsedType,
            description: finalDescription,
            mediaBlob: imageFile,
            mediaFilename: imageFile.name,
            mediaMimeType: imageFile.type || 'image/jpeg',
            timestamp: Date.now()
          });
        } else if (audioBlob) {
          savedOffline = await saveOfflineReport({
            id: uuidv4(),
            type: 'voice',
            latitude: String(finalLat),
            longitude: String(finalLng),
            mediaBlob: audioBlob,
            mediaFilename: 'voice_report.webm',
            mediaMimeType: audioBlob.type || 'audio/webm',
            timestamp: Date.now()
          });
        }

        if (!savedOffline) {
          toast.error('Unable to save report offline. Please try again or check your browser storage settings.');
          setIsSubmitting(false);
          return;
        }

        navigate('/dashboard');
        return;
      }

      if (imageFile) {
        formData.append('image', imageFile);
        formData.append('hazard_type', parsedType);
        formData.append('description', finalDescription);
        if (aiResult?.severity) {
          formData.append('severity_score', String(aiResult.severity));
        }
        if (aiResult?.confidence) {
          formData.append('confidence_score', String(aiResult.confidence));
        }
        
        await api.post('/hazards/upload', formData);
      } else if (audioBlob) {
        formData.append('audio', audioBlob, 'voice_report.webm');
        await api.post('/hazards/voice-report', formData);
      } else {
        toast.error("Please provide an image or voice recording");
        setIsSubmitting(false);
        return;
      }

      toast.success('Hazard reported successfully! You earned 50 points.');
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Submission failed", error);
      
      // Determine if this is a network-level error (backend unreachable)
      const isNetworkError = 
        error?.code === 'ERR_NETWORK' || 
        error?.code === 'ERR_CONNECTION_REFUSED' ||
        error?.code === 'ECONNABORTED' ||
        error?.message?.includes('Network Error') || 
        !error?.response;
      
      if (isNetworkError) {
        // Backend is unreachable — save offline so user's work isn't lost
        let savedOffline = true;

        if (imageFile) {
          savedOffline = await saveOfflineReport({
            id: uuidv4(),
            type: 'image',
            latitude: String(finalLat),
            longitude: String(finalLng),
            hazard_type: parsedType,
            description: finalDescription,
            mediaBlob: imageFile,
            mediaFilename: imageFile.name,
            mediaMimeType: imageFile.type || 'image/jpeg',
            timestamp: Date.now()
          });
        } else if (audioBlob) {
          savedOffline = await saveOfflineReport({
            id: uuidv4(),
            type: 'voice',
            latitude: String(finalLat),
            longitude: String(finalLng),
            mediaBlob: audioBlob,
            mediaFilename: 'voice_report.webm',
            mediaMimeType: audioBlob.type || 'audio/webm',
            timestamp: Date.now()
          });
        }

        if (!savedOffline) {
          toast.error('Backend is unreachable and offline save failed. Please check your connection and try again.');
          return;
        }

        toast.success('Backend unavailable — report saved offline. It will sync automatically when the server is back.');
        navigate('/dashboard');
        return;
      }
      
      // Backend responded with an error — show a specific message
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      
      if (status === 401) {
        toast.error("Session expired or not logged in. Please log in again.");
      } else if (status === 422) {
        // Validation error from FastAPI
        const validationMsg = typeof detail === 'string' 
          ? detail 
          : Array.isArray(detail) 
            ? detail.map((e: any) => e?.msg || e?.message || JSON.stringify(e)).join('; ')
            : "Invalid form data. Please check your inputs.";
        toast.error(`Validation error: ${validationMsg}`);
      } else if (status === 413) {
        toast.error("File too large. Please upload an image under 5MB.");
      } else if (status && status >= 500) {
        toast.error("Server error. The team has been notified. Please try again shortly.");
      } else {
        toast.error(detail || "Failed to submit hazard report. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLocationComplete = coords || (manualLocation.state && manualLocation.district && manualLocation.locality);

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-2">
      <div className="mb-8 border-b-2 border-[#138808] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#000080] dark:text-foreground">Official Hazard Report Form</h1>
          <p className="text-muted-foreground font-bold text-sm uppercase tracking-wider mt-2">Document infrastructure discrepancies for municipal action.</p>
        </div>
        <div className="flex items-center text-xs font-mono bg-slate-50 dark:bg-muted border border-border px-4 py-2 text-muted-foreground shadow-sm">
          <FileText className="w-4 h-4 mr-2" /> FORM: HM-09A (REV 2)
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-white dark:bg-card border border-border rounded-sm p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between relative">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex flex-col items-center w-1/4 relative z-10">
              <div className={`w-10 h-10 flex items-center justify-center font-bold text-sm border ${step >= i ? 'bg-[#000080] dark:bg-primary text-white border-[#000080] dark:border-primary shadow-sm' : 'bg-slate-100 dark:bg-muted text-muted-foreground border-border'}`}>
                {step > i ? <CheckCircle className="w-5 h-5" /> : i}
              </div>
              <div className={`text-xs mt-3 uppercase font-bold tracking-widest hidden sm:block ${step >= i ? 'text-[#000080] dark:text-primary' : 'text-muted-foreground'}`}>
                {i === 1 ? 'Media Upload' : i === 2 ? 'AI Analysis' : i === 3 ? 'Location Data' : 'Review & Submit'}
              </div>
            </div>
          ))}
          <div className="absolute top-5 left-0 w-full h-[2px] bg-border -z-0">
             <div className="h-full bg-[#000080] dark:bg-primary transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }} />
          </div>
        </div>
      </div>

      <Card className="min-h-[500px] border-t-4 border-t-[#000080] rounded-sm shadow-sm bg-white dark:bg-card">
        <CardContent className="p-0 flex flex-col h-full justify-between">
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col">
              <div className="bg-slate-50 dark:bg-muted/50 border-b border-border py-4 px-8 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase text-[#000080] dark:text-primary tracking-wider">Step 1: Visual Documentation</h3>
                <span className="text-sm font-mono text-muted-foreground font-bold">1/4</span>
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                <div className="border-2 border-dashed border-border bg-slate-50 dark:bg-background p-12 flex flex-col items-center justify-center hover:bg-slate-100 dark:hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden group min-h-[250px]">
                  <input type="file" accept="image/*" capture="environment" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={handleImageUpload} />
                  {image ? (
                    <img src={image} className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" />
                  ) : null}
                  <UploadCloud className="w-12 h-12 text-[#000080] dark:text-primary mb-4 z-10" />
                  <h3 className="font-black text-base uppercase tracking-wider z-10 text-foreground">Select File or Capture Image</h3>
                  <p className="text-sm font-medium text-muted-foreground mt-2 text-center z-10">Ensure the hazard is clearly visible. Max size 5MB.</p>
                  {image && <div className="absolute top-4 right-4 bg-[#138808] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider z-20 flex items-center shadow-sm"><CheckCircle className="w-4 h-4 mr-2"/> File Attached</div>}
                </div>

                <div className="space-y-4 pt-8 border-t border-border">
                  <label className="text-sm font-bold uppercase tracking-wider text-foreground">Audio Transcription (Optional)</label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Button 
                      type="button" 
                      variant={isRecording ? "destructive" : "outline"} 
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-full sm:w-auto rounded-sm h-12 px-6 font-bold uppercase text-xs tracking-wider ${!isRecording && 'border-border text-foreground hover:bg-slate-50'}`}
                    >
                      {isRecording ? <MicOff className="mr-2 h-5 w-5" /> : <Mic className="mr-2 h-5 w-5" />}
                      {isRecording ? 'Stop Recording' : 'Record Audio'}
                    </Button>
                    {isRecording && (
                      <div className="flex gap-3 h-12 items-center px-6 bg-destructive text-white font-bold text-xs uppercase tracking-wider animate-pulse rounded-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-white"></span> Recording in progress...
                      </div>
                    )}
                    {!isRecording && (
                      <Button 
                        type="button"
                        onClick={() => {
                           setTranscript('Hindi: "Yahan sadak par bohot bada gaddha hai."');
                           toast.loading('Bhashini AI translating to English...', { duration: 2000 });
                           setTimeout(() => {
                              setTranscript('Large pothole on the road here.');
                              toast.success('Bhashini AI translation complete');
                           }, 2000);
                        }}
                        className="w-full sm:w-auto h-12 px-6 rounded-sm font-bold uppercase text-xs tracking-wider bg-[#FF9933]/10 text-[#FF9933] hover:bg-[#FF9933]/20 border border-[#FF9933]/30 flex items-center shadow-none"
                      >
                         <Globe className="w-4 h-4 mr-2" /> Bhashini AI Translate (Mock)
                      </Button>
                    )}
                  </div>
                  <Input 
                    placeholder="Manual description entry..." 
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    className="mt-4 rounded-sm border-border bg-slate-50 dark:bg-background focus-visible:ring-[#000080] h-12 text-sm font-medium"
                  />
                  {audioUrl && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      <label className="block uppercase tracking-widest text-[10px] font-bold mb-2">Recorded audio preview</label>
                      <audio controls src={audioUrl} className="w-full rounded-sm border border-border" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end p-6 border-t border-border bg-slate-50 dark:bg-muted/50 mt-auto">
                <Button className="h-12 px-10 rounded-sm font-bold uppercase text-xs tracking-wider bg-[#FF9933] hover:bg-[#e68a2e] text-white shadow-sm" disabled={!image} onClick={handleNext}>Proceed to AI Analysis</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col">
              <div className="bg-slate-50 dark:bg-muted/50 border-b border-border py-4 px-8 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase text-[#000080] dark:text-primary tracking-wider">Step 2: Automated Verification</h3>
                <span className="text-sm font-mono text-muted-foreground font-bold">2/4</span>
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                <DetectionOverlay imageUrl={image} onAnalysisComplete={setAiResult} />
                
                {aiResult && (
                  <div className="border border-destructive bg-[#fef2f2] dark:bg-destructive/10 rounded-sm shadow-sm overflow-hidden mt-8">
                    <div className="bg-destructive text-white py-3 px-5 flex items-center font-black text-xs uppercase tracking-wider">
                      <ShieldAlert className="mr-2 h-5 w-5" /> Detection Results Log
                    </div>
                    <table className="w-full text-left text-sm font-mono">
                      <tbody className="divide-y divide-destructive/20">
                        <tr>
                          <td className="py-3 px-5 font-bold text-destructive/80 w-1/3 uppercase tracking-wider">Classification</td>
                          <td className="py-3 px-5 font-black uppercase text-destructive text-base">{aiResult.type}</td>
                        </tr>
                        <tr>
                          <td className="py-3 px-5 font-bold text-destructive/80 uppercase tracking-wider">Confidence</td>
                          <td className="py-3 px-5 font-bold text-foreground text-base">{aiResult.confidence}%</td>
                        </tr>
                        <tr className="bg-destructive/5">
                          <td className="py-4 px-5 font-bold text-destructive/80 uppercase tracking-wider">Severity Score</td>
                          <td className="py-4 px-5 font-black text-destructive text-2xl">{aiResult.severity} / 10</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex gap-4 p-6 border-t border-border bg-slate-50 dark:bg-muted/50 justify-between mt-auto">
                <Button variant="outline" onClick={handlePrev} className="rounded-sm h-12 px-8 font-bold uppercase text-xs tracking-wider border-border bg-white dark:bg-card">Previous Step</Button>
                <Button onClick={handleNext} disabled={!aiResult} className="rounded-sm h-12 px-10 font-bold uppercase text-xs tracking-wider bg-[#000080] text-white hover:bg-[#000066] shadow-sm">Confirm Analysis</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col">
               <div className="bg-slate-50 dark:bg-muted/50 border-b border-border py-4 px-8 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase text-[#000080] dark:text-primary tracking-wider">Step 3: Geographic Data</h3>
                <span className="text-sm font-mono text-muted-foreground font-bold">3/4</span>
              </div>
              
              <div className="p-8 space-y-8 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* GPS Location Block */}
                <div className="p-8 border border-border bg-slate-50 dark:bg-background text-center space-y-6 flex flex-col items-center justify-center shadow-sm">
                  <div className="w-20 h-20 bg-white dark:bg-card border border-border flex items-center justify-center shadow-sm">
                    <MapPin className="w-10 h-10 text-[#FF9933]" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-wider text-foreground">Acquire GPS Lock</h3>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mt-3 max-w-sm mx-auto">Precise coordinates assist rapid municipal response.</p>
                  </div>
                  
                  <Button onClick={getLocation} disabled={locLoading} size="lg" className="w-full sm:w-auto h-12 px-10 rounded-sm font-bold uppercase text-xs tracking-wider shadow-sm bg-[#000080] text-white hover:bg-[#000066]">
                    {locLoading ? 'Acquiring GPS Signal...' : 'Fetch GPS Data'}
                  </Button>

                  {coords && (
                    <div className="w-full border-t border-border pt-6 mt-4">
                      <table className="w-full text-left text-xs font-mono border border-[#138808]">
                        <thead className="bg-[#138808] text-white">
                          <tr><th colSpan={2} className="py-2.5 px-4 font-bold uppercase tracking-wider"><CheckCircle className="w-4 h-4 inline mr-2" /> Coordinates Locked</th></tr>
                        </thead>
                        <tbody className="bg-[#138808]/5 text-[#138808] dark:text-success divide-y divide-[#138808]/20">
                          <tr>
                            <td className="py-3 px-4 font-bold uppercase tracking-wider w-1/3">Latitude</td>
                            <td className="py-3 px-4 font-black">{coords.lat.toFixed(6)}° N</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-bold uppercase tracking-wider">Longitude</td>
                            <td className="py-3 px-4 font-black">{coords.lng.toFixed(6)}° E</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Manual Location Block */}
                <div className="p-8 border border-border bg-white dark:bg-card space-y-6 shadow-sm flex flex-col">
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-wider text-[#000080] dark:text-primary flex items-center">
                      <FileText className="w-5 h-5 mr-2" /> Manual Locality Entry
                    </h3>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-wider mt-2">Required if GPS lock is inaccurate or unavailable.</p>
                  </div>

                  <div className="space-y-4 flex-1">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">State / UT</label>
                         <Input value={manualLocation.state} onChange={e => setManualLocation({...manualLocation, state: e.target.value})} placeholder="e.g. Maharashtra" className="rounded-sm bg-slate-50 dark:bg-background" />
                       </div>
                       <div className="space-y-2">
                         <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">District / City</label>
                         <Input value={manualLocation.district} onChange={e => setManualLocation({...manualLocation, district: e.target.value})} placeholder="e.g. Mumbai" className="rounded-sm bg-slate-50 dark:bg-background" />
                       </div>
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Locality / Ward / Landmark</label>
                       <Input value={manualLocation.locality} onChange={e => setManualLocation({...manualLocation, locality: e.target.value})} placeholder="e.g. Near Andheri Station, Ward K" className="rounded-sm bg-slate-50 dark:bg-background" />
                     </div>
                     <div className="space-y-2">
                       <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pincode</label>
                       <Input value={manualLocation.pincode} onChange={e => setManualLocation({...manualLocation, pincode: e.target.value})} placeholder="e.g. 400053" className="rounded-sm bg-slate-50 dark:bg-background w-1/2" />
                     </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 p-6 border-t border-border bg-slate-50 dark:bg-muted/50 justify-between mt-auto">
                <Button variant="outline" onClick={handlePrev} className="rounded-sm h-12 px-8 font-bold uppercase text-xs tracking-wider border-border bg-white dark:bg-card">Previous Step</Button>
                <Button onClick={handleNext} disabled={!isLocationComplete} className="rounded-sm h-12 px-10 font-bold uppercase text-xs tracking-wider bg-[#000080] text-white hover:bg-[#000066] shadow-sm">Proceed to Review</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col">
               <div className="bg-slate-50 dark:bg-muted/50 border-b border-border py-4 px-8 flex justify-between items-center">
                <h3 className="font-bold text-sm uppercase text-[#000080] dark:text-primary tracking-wider">Step 4: Final Verification</h3>
                <span className="text-sm font-mono text-muted-foreground font-bold">4/4</span>
              </div>
              
              <div className="p-8 space-y-8 flex-1">
                <div className="bg-white dark:bg-card border border-border shadow-sm flex flex-col md:flex-row items-stretch">
                   <div className="md:w-1/3 p-6 border-b md:border-b-0 md:border-r border-border bg-slate-50 dark:bg-muted/30 flex items-center justify-center">
                      {image && <img src={image} className="w-full max-h-48 object-contain border border-border shadow-sm bg-background" />}
                   </div>
                   <div className="md:w-2/3 p-0">
                     <table className="w-full text-left text-sm h-full">
                        <tbody className="divide-y divide-border h-full">
                          <tr>
                            <td className="py-4 px-6 font-bold uppercase text-muted-foreground w-1/3 bg-slate-50/50 dark:bg-background border-r border-border tracking-wider">Detected Hazard</td>
                            <td className="py-4 px-6 font-black text-foreground uppercase">{aiResult?.type}</td>
                          </tr>
                          <tr>
                            <td className="py-4 px-6 font-bold uppercase text-muted-foreground bg-slate-50/50 dark:bg-background border-r border-border tracking-wider">Severity Rating</td>
                            <td className="py-4 px-6 font-black text-destructive text-lg">{aiResult?.severity} / 10</td>
                          </tr>
                          <tr>
                            <td className="py-4 px-6 font-bold uppercase text-muted-foreground bg-slate-50/50 dark:bg-background border-r border-border tracking-wider">Coordinates</td>
                            <td className="py-4 px-6 font-mono font-bold text-foreground">
                              {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-4 px-6 font-bold uppercase text-muted-foreground bg-slate-50/50 dark:bg-background border-r border-border tracking-wider">Locality</td>
                            <td className="py-4 px-6 font-bold text-foreground">
                              {[manualLocation.locality, manualLocation.district, manualLocation.state].filter(Boolean).join(', ') || 'N/A'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-4 px-6 font-bold uppercase text-muted-foreground bg-slate-50/50 dark:bg-background border-r border-border tracking-wider">Statement</td>
                            <td className="py-4 px-6 font-medium italic text-foreground">{transcript || 'No statement provided.'}</td>
                          </tr>
                        </tbody>
                     </table>
                   </div>
                </div>

                <div className="bg-[#fdf2e9] dark:bg-yellow-950/20 p-5 border border-[#FF9933]/30 flex items-start gap-4 rounded-sm">
                   <AlertTriangle className="w-6 h-6 text-[#FF9933] shrink-0 mt-0.5" />
                   <p className="text-xs text-[#b45309] dark:text-yellow-500 font-bold uppercase tracking-wider leading-relaxed">
                     I hereby declare that the information provided is accurate and true to the best of my knowledge. I understand that submitting false reports may lead to suspension of portal access.
                   </p>
                </div>
              </div>

              <div className="flex gap-4 p-6 border-t border-border bg-slate-50 dark:bg-muted/50 justify-between mt-auto">
                <Button variant="outline" onClick={handlePrev} className="rounded-sm h-14 px-8 font-bold uppercase text-sm tracking-wider border-border bg-white dark:bg-card">Edit Details</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto bg-[#138808] hover:bg-green-700 text-white h-14 px-12 font-black uppercase text-sm tracking-widest shadow-md flex items-center">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit Official Report'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
