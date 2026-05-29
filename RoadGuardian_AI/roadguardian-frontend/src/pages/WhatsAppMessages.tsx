import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

interface WhatsAppMessage {
  id: number;
  hazard_type: string;
  description: string;
  latitude: number;
  longitude: number;
  created_at: string;
  status: string;
  severity_score: number;
  urgency_level: string;
  linked_department?: string;
  reporter_name?: string;
}

export const WhatsAppMessages = () => {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    fetchWhatsAppMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(fetchWhatsAppMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchWhatsAppMessages = async () => {
    try {
      const response = await api.get('/hazards/dashboard');
      // Filter messages that came from WhatsApp (description contains "[WhatsApp Report]")
      const whatsappMessages = response.data.recent_hazards?.filter((h: WhatsAppMessage) =>
        h.description?.includes('[WhatsApp Report]')
      ) || [];
      setMessages(whatsappMessages);
    } catch (error) {
      console.error('Failed to fetch WhatsApp messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMessages = messages.filter(msg => {
    if (filter === 'pending') return msg.status === 'pending';
    if (filter === 'resolved') return msg.status === 'resolved';
    return true;
  });

  const hazardTypeColors: Record<string, string> = {
    pothole: 'bg-yellow-100 text-yellow-800',
    crack: 'bg-orange-100 text-orange-800',
    waterlogging: 'bg-blue-100 text-blue-800',
    broken_dividers: 'bg-red-100 text-red-800',
    missing_signs: 'bg-purple-100 text-purple-800',
    street_light_fault: 'bg-indigo-100 text-indigo-800',
    manhole_defect: 'bg-red-200 text-red-800',
    road_debris: 'bg-gray-100 text-gray-800',
    pavement_defect: 'bg-amber-100 text-amber-800',
    other: 'bg-slate-100 text-slate-800'
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 7) return 'text-red-600';
    if (severity >= 5) return 'text-orange-600';
    if (severity >= 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-500 rounded-lg">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">WhatsApp Reports</h1>
              <p className="text-slate-600">Real-time road hazard reports via WhatsApp</p>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {(['all', 'pending', 'resolved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === tab
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="ml-2 text-sm opacity-80">
                  ({filteredMessages.length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Messages List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-slate-200">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No WhatsApp messages yet</p>
            </div>
          ) : (
            filteredMessages.map((msg, idx) => (
              <div
                key={msg.id || idx}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-slate-200 overflow-hidden"
              >
                <div className="p-4">
                  {/* Message Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        WA
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          Report #{msg.id}
                        </h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(msg.created_at)} at {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        msg.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {msg.status === 'resolved' ? '✓ Resolved' : '⏳ Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Hazard Type Badge */}
                  <div className="mb-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      hazardTypeColors[msg.hazard_type] || hazardTypeColors.other
                    }`}>
                      {msg.hazard_type?.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    {msg.severity_score && (
                      <span className={`ml-2 text-sm font-semibold ${getSeverityColor(msg.severity_score)}`}>
                        Severity: {msg.severity_score.toFixed(1)}/10
                      </span>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded mb-3">
                    <p className="text-slate-700 text-sm">
                      {msg.description?.replace('[WhatsApp Report] ', '') || 'No description'}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded">
                    <MapPin className="w-3 h-3 text-red-500" />
                    <span>
                      Lat: {msg.latitude?.toFixed(4)}, Lng: {msg.longitude?.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {messages.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-slate-600 text-sm font-medium">Total Reports</p>
              <p className="text-2xl font-bold text-slate-900">{messages.length}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-slate-600 text-sm font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {messages.filter(m => m.status === 'pending').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-slate-600 text-sm font-medium">Resolved</p>
              <p className="text-2xl font-bold text-green-600">
                {messages.filter(m => m.status === 'resolved').length}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200">
              <p className="text-slate-600 text-sm font-medium">Most Common</p>
              <p className="text-2xl font-bold text-blue-600">
                {messages.reduce((acc: Record<string, number>, m) => {
                  acc[m.hazard_type] = (acc[m.hazard_type] || 0) + 1;
                  return acc;
                }, {}) &&
                  Object.entries(
                    messages.reduce((acc: Record<string, number>, m) => {
                      acc[m.hazard_type] = (acc[m.hazard_type] || 0) + 1;
                      return acc;
                    }, {})
                  ).sort((a, b) => b[1] - a[1])[0]?.[0]?.replace(/_/g, ' ') || 'N/A'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
