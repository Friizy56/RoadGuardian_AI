import { useState } from 'react';

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const startRecording = () => {
    setIsRecording(true);
    // Simulate recording for 3 seconds then setting a transcript
    setTimeout(() => {
      setTranscript("There is a massive pothole in the middle lane causing cars to swerve.");
      setIsRecording(false);
    }, 3000);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  return { isRecording, transcript, startRecording, stopRecording, setTranscript };
};
