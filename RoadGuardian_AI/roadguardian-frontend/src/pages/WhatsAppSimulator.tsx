import React, { useState } from 'react';
import { Send, Phone, MoreVertical, Paperclip, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';

export const WhatsAppSimulator = () => {
  const [phoneNumber, setPhoneNumber] = useState('+14155238886');
  const [messages, setMessages] = useState<{ text: string; isBot: boolean }[]>([
    { text: "Send a message to report a road hazard (e.g. 'huge pothole at Main St').", isBot: true }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setMessages(prev => [...prev, { text: userMessage, isBot: false }]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Create FormData exactly like Twilio sends it
      const formData = new FormData();
      formData.append('From', `whatsapp:${phoneNumber}`);
      formData.append('Body', userMessage);
      formData.append('Latitude', '13.0827');
      formData.append('Longitude', '80.2707');

      // Send to backend webhook - do NOT set Content-Type header
      // Browser will automatically set it to multipart/form-data with boundary
      const response = await fetch('http://127.0.0.1:8000/whatsapp/webhook', {
        method: 'POST',
        body: formData,
        // Don't set headers - let browser handle it
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('Error response:', responseText);
        setMessages(prev => [...prev, { text: `❌ Error: ${response.status}`, isBot: true }]);
        return;
      }

      // Parse the TwiML XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseText, 'text/xml');
      const botReply = xmlDoc.getElementsByTagName('Message')[0]?.textContent || "Error parsing response";

      setMessages(prev => [...prev, { text: botReply, isBot: true }]);
      toast.success('Message sent successfully!');
    } catch (error) {
      console.error('Send error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to communicate with the WhatsApp webhook';
      toast.error(errorMsg);
      setMessages(prev => [...prev, { text: `❌ ${errorMsg}`, isBot: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[80vh] w-full">
      <div className="w-full max-w-sm bg-[#ece5dd] border border-[#d1d7db] shadow-2xl rounded-3xl overflow-hidden flex flex-col h-[600px] relative">
        
        {/* WhatsApp Header */}
        <div className="bg-[#075E54] text-white p-3 px-4 flex items-center justify-between shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#128C7E] flex items-center justify-center text-xs font-bold border border-white/20">
              GOV
            </div>
            <div>
              <h3 className="font-bold text-sm">RoadGuardian AI</h3>
              <p className="text-[10px] text-white/80">Official Government Bot</p>
            </div>
          </div>
          <div className="flex items-center gap-3 opacity-80">
            <Phone className="w-4 h-4" />
            <MoreVertical className="w-5 h-5" />
          </div>
        </div>

        {/* WhatsApp Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', backgroundSize: 'contain', backgroundBlendMode: 'overlay' }}>
          {/* Mock Date Badge */}
          <div className="flex justify-center my-2">
            <span className="bg-[#E1F3FB] text-slate-600 text-xs px-3 py-1 rounded-lg shadow-sm font-medium">TODAY</span>
          </div>

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-lg p-2 px-3 text-sm shadow-sm relative ${
                msg.isBot ? 'bg-white text-gray-800 rounded-tl-none' : 'bg-[#dcf8c6] text-gray-800 rounded-tr-none'
              }`}>
                {msg.text}
                <div className="text-[9px] text-gray-500 text-right mt-1 font-mono uppercase">
                  {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  {!msg.isBot && <span className="ml-1 text-blue-500 font-bold">✓✓</span>}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg p-2 rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#128C7E]" />
                <span className="text-xs text-gray-500 italic">Bot is typing...</span>
              </div>
            </div>
          )}
        </div>

        {/* WhatsApp Input Area */}
        <div className="bg-[#f0f0f0] p-2 px-3 flex items-center gap-2 border-t border-gray-300">
          <Paperclip className="w-6 h-6 text-gray-500" />
          <form onSubmit={sendMessage} className="flex-1 flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Type a message" 
              className="flex-1 rounded-full px-4 py-2 text-sm border-none focus:ring-0 outline-none text-slate-900 bg-white"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              disabled={isLoading || !inputValue.trim()}
              className="bg-[#128C7E] w-10 h-10 rounded-full flex items-center justify-center shadow-md disabled:opacity-50 flex-shrink-0 text-white"
            >
              <Send className="w-4 h-4 ml-1" />
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-6 text-center max-w-sm">
        <p className="text-xs text-muted-foreground bg-muted p-3 rounded-xl border border-border">
          <strong>Twilio Webhook Simulator:</strong><br/> This UI generates a mock <code>x-www-form-urlencoded</code> POST payload to test the <code>/whatsapp/webhook</code> endpoint locally without API keys.
        </p>
      </div>
    </div>
  );
};
