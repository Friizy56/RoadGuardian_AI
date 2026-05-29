import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  Loader2, 
  Check, 
  Users, 
  Upload, 
  ShieldAlert, 
  FileText, 
  RefreshCw,
  Award,
  Leaf,
  DollarSign,
  Globe,
  Flame,
  Shield,
  Activity,
  BarChart3
} from 'lucide-react';
import { api } from '@/services/api';
import toast from 'react-hot-toast';

const COLORS = ['#06b6d4', '#9333ea', '#f59e0b', '#dc2626', '#10b981', '#3b82f6'];

export const AuthorityDashboard = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'pending' | 'active' | 'national'>('analytics');
  
  // VIP State Presentation additions
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [budget, setBudget] = useState(25); // In Millions USD
  
  // Dynamic simulations based on budget
  const livesSaved = Math.round(budget * 5.8);
  const accidentsPrevented = Math.round(budget * 22.4);
  const speedImprovement = (budget * 0.45).toFixed(1);
  const co2Saved = Math.round(budget * 14.2);
  const ecoMaterial = Math.round(budget * 82);
  const treesPlanted = Math.round(co2Saved * 45);

  // Analytics State
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);


  // Pending Reviews State
  const [pendingHazards, setPendingHazards] = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [selectedHazards, setSelectedHazards] = useState<number[]>([]);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);

  // Active Crews / Dispatches State
  const [activeHazards, setActiveHazards] = useState<any[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);

  // Modals & Action States
  const [assignCrewModal, setAssignCrewModal] = useState<any | null>(null);
  const [crewName, setCrewName] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [resolvingHazard, setResolvingHazard] = useState<any | null>(null);
  const [resolvedImage, setResolvedImage] = useState<File | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Fetch functions
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const response = await api.get('/hazards/dashboard');
      setAnalyticsData(response.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast.error("Failed to load analytics summaries.");
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const response = await api.get('/hazards/authority/pending');
      setPendingHazards(response.data);
      setSelectedHazards([]);
    } catch (error) {
      console.error("Failed to fetch pending hazards:", error);
      toast.error("Failed to load pending reviews.");
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const fetchActive = useCallback(async () => {
    setLoadingActive(true);
    try {
      const response = await api.get('/hazards/authority/active');
      setActiveHazards(response.data);
    } catch (error) {
      console.error("Failed to fetch active hazards:", error);
      toast.error("Failed to load active tasks.");
    } finally {
      setLoadingActive(false);
    }
  }, []);

  // Run initial loading based on active tab
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'pending') {
      fetchPending();
    } else if (activeTab === 'active') {
      fetchActive();
    }
  }, [activeTab, fetchAnalytics, fetchPending, fetchActive]);

  // Bulk actions
  const handleToggleSelect = (id: number) => {
    setSelectedHazards(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPending = () => {
    if (selectedHazards.length === pendingHazards.length) {
      setSelectedHazards([]);
    } else {
      setSelectedHazards(pendingHazards.map(h => h.id));
    }
  };

  const handleBulkVerify = async () => {
    if (selectedHazards.length === 0) return;
    setIsBulkVerifying(true);
    try {
      const res = await api.post('/hazards/authority/verify-bulk', selectedHazards);
      toast.success(`Successfully verified ${res.data.verified_count} report(s).`);
      fetchPending();
    } catch (error) {
      console.error("Bulk verification failed:", error);
      toast.error("Failed to bulk verify selected reports.");
    } finally {
      setIsBulkVerifying(false);
    }
  };

  // Crew Assignment
  const handleAssignCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCrewModal || !crewName.trim()) return;
    setIsAssigning(true);
    try {
      await api.post(`/hazards/authority/assign/${assignCrewModal.id}`, { crew_name: crewName });
      toast.success(`Assigned crew "${crewName}" to hazard #${assignCrewModal.id}.`);
      setAssignCrewModal(null);
      setCrewName('');
      fetchPending();
    } catch (error) {
      console.error("Crew assignment failed:", error);
      toast.error("Failed to assign repair crew.");
    } finally {
      setIsAssigning(false);
    }
  };

  // Single Quick Verification
  const handleSingleVerify = async (id: number) => {
    try {
      await api.post('/hazards/authority/verify-bulk', [id]);
      toast.success(`Report #${id} verified successfully.`);
      fetchPending();
    } catch (error) {
      console.error("Verification failed:", error);
      toast.error("Failed to verify report.");
    }
  };

  // Resolution proof upload
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingHazard || !resolvedImage) {
      toast.error("Proof image is required.");
      return;
    }

    setIsResolving(true);
    try {
      const formData = new FormData();
      formData.append('resolved_image', resolvedImage);
      if (resolutionNotes) {
        formData.append('resolution_notes', resolutionNotes);
      }

      await api.post(`/hazards/authority/resolve/${resolvingHazard.id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(`Hazard #${resolvingHazard.id} marked as fully resolved.`);
      
      // VIP DEMO: Simulate a WhatsApp notification to the citizen
      setTimeout(() => {
        toast.custom((t) => (
          <div className="bg-[#075E54] text-white p-4 rounded-xl shadow-2xl max-w-sm w-full flex gap-3 border border-[#25D366]/30 animate-in slide-in-from-right-10">
            <div className="bg-[#25D366] w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 text-white shadow-inner">GOV</div>
            <div>
              <p className="font-bold text-sm flex items-center gap-1">Govt. of India Update <CheckCircle2 className="w-3 h-3 text-[#34B7F1]" /></p>
              <p className="text-xs opacity-90 mt-1 leading-relaxed">Dear Citizen, your reported hazard #{resolvingHazard.id} has been resolved by our crews. Thank you for making India safer! 🇮🇳</p>
              <p className="text-[9px] opacity-70 mt-2 uppercase tracking-widest font-mono">WhatsApp Official Business</p>
            </div>
          </div>
        ), { duration: 6000, position: 'bottom-right' });
      }, 1500);

      setResolvingHazard(null);
      setResolvedImage(null);
      setResolutionNotes('');
      fetchActive();
    } catch (error) {
      console.error("Resolution failed:", error);
      toast.error("Failed to submit resolution proof.");
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className={`space-y-6 p-1 rounded-2xl transition-all duration-500 ${
      isEmergencyMode 
        ? 'ring-2 ring-red-500 shadow-[0_0_30px_rgba(239,68,68,0.25)] bg-red-950/10' 
        : ''
    }`}>
      {/* Dynamic Crisis Alert Banner */}
      {isEmergencyMode && (
        <div className="bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-between animate-pulse shadow-lg">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 animate-bounce" />
            <span>NATIONWIDE CIVIL DEFENSE EMERGENCY PROTOCOL IS ACTIVE - MAIN HIGHWAYS DIRECTED BY VIP EMERGENCY DISPATCH</span>
          </div>
          <span className="text-2xs bg-black/40 px-2 py-0.5 rounded uppercase">Level 1 Alert</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight transition-all ${
            isEmergencyMode 
              ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]' 
              : 'bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 bg-clip-text text-transparent'
          }`}>
            {isEmergencyMode ? '🚨 NATIONAL EMERGENCY ROAD CONTROL COMMAND' : 'Government Road Safety Portal'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEmergencyMode ? 'Presidential Strategic Response & EVACUATION Center' : 'Municipality Control Center & Operations Panel'}
          </p>
        </div>

        {/* Emergency Mode Toggle & Tab Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsEmergencyMode(!isEmergencyMode)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
              isEmergencyMode 
                ? 'bg-red-600 text-white hover:bg-red-500 animate-pulse' 
                : 'bg-muted hover:bg-red-950/20 text-muted-foreground hover:text-red-500 border border-border'
            }`}
          >
            <Shield className="w-4 h-4" />
            {isEmergencyMode ? 'Disable Crisis Mode' : 'National Crisis Mode'}
          </button>
          
          {/* Modern Glassmorphic Navigation Tabs */}
          <div className="flex bg-muted/40 backdrop-blur-md border border-border p-1 rounded-xl shadow-lg">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Analytics
            </button>
            <button 
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'pending' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pending Review
            </button>
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'active' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active Crews
            </button>
            <button 
              onClick={() => setActiveTab('national')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'national' 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe className="w-4 h-4" />
              National Command
            </button>
          </div>
        </div>
      </div>


      {/* ==================================================== */}
      {/* ANALYTICS TAB                                        */}
      {/* ==================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {loadingAnalytics ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Hazards</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{analyticsData?.total_hazards || 0}</div>
                    <p className="text-xs text-muted-foreground">Lifetime reports received</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                    <Clock className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData?.pending_count || 0}</div>
                    <p className="text-xs text-muted-foreground">{analyticsData?.high_urgency_count || 0} critical priority</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Severity</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData?.avg_severity?.toFixed(1) || '0.0'} / 10</div>
                    <p className="text-xs text-muted-foreground">System-wide AI confidence</p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolved Hazards</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData?.resolved_count || 0}</div>
                    <p className="text-xs text-muted-foreground">Total repairs completed</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
                  <CardHeader>
                    <CardTitle>Hazards Reported Over Time</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {analyticsData?.time_data?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData.time_data}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                          <XAxis dataKey="name" stroke="#888" />
                          <YAxis stroke="#888" />
                          <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                          <Line type="monotone" dataKey="hazards" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">No dynamic data available</div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
                  <CardHeader>
                    <CardTitle>Hazard Category Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    {analyticsData?.type_data?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.type_data}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                          >
                            {analyticsData.type_data.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* PENDING REVIEWS TAB                                  */}
      {/* ==================================================== */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-yellow-500" /> Pending Verification Queue
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Review, dispatch repairs, or bulk verify citizen safety submissions.</p>
              </div>
              <button 
                onClick={fetchPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-muted/50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingPending ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : pendingHazards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <p className="font-medium text-lg text-foreground">Zero hazards pending!</p>
                  <p className="text-sm">All road reports have been verified or resolved.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bulk operations bar */}
                  <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border border-border/60">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox" 
                        id="selectAll"
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        checked={pendingHazards.length > 0 && selectedHazards.length === pendingHazards.length}
                        onChange={handleSelectAllPending}
                      />
                      <label htmlFor="selectAll" className="text-sm font-bold cursor-pointer select-none">
                        Select All ({selectedHazards.length} selected)
                      </label>
                    </div>
                    <button
                      onClick={handleBulkVerify}
                      disabled={selectedHazards.length === 0 || isBulkVerifying}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow"
                    >
                      {isBulkVerifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Bulk Verify selected
                    </button>
                  </div>

                  {/* Hazard list */}
                  <div className="divide-y divide-border/60">
                    {pendingHazards.map((hazard) => (
                      <div key={hazard.id} className="flex flex-col lg:flex-row lg:items-center justify-between py-4 gap-4">
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 mt-1.5 cursor-pointer"
                            checked={selectedHazards.includes(hazard.id)}
                            onChange={() => handleToggleSelect(hazard.id)}
                          />
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-bold text-lg text-foreground uppercase tracking-wide">
                                {hazard.hazard_type.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                hazard.severity_score >= 8.0 
                                  ? 'bg-destructive/25 border border-destructive/40 text-red-500'
                                  : hazard.severity_score >= 5.0
                                  ? 'bg-yellow-500/25 border border-yellow-500/40 text-yellow-500'
                                  : 'bg-green-500/25 border border-green-500/40 text-green-500'
                              }`}>
                                Severity {hazard.severity_score.toFixed(1)}/10
                              </span>
                              {hazard.image_url ? (
                                <span className="bg-cyan-500/10 border border-cyan-500/35 text-cyan-400 text-2xs px-2 py-0.5 rounded-full font-bold">
                                  Visual Report
                                </span>
                              ) : (
                                <span className="bg-purple-500/10 border border-purple-500/35 text-purple-400 text-2xs px-2 py-0.5 rounded-full font-bold">
                                  Voice Report
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                              {hazard.description || "No specific details provided."}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground/80 mt-2 font-medium">
                              <span>📍 Lat: {hazard.latitude.toFixed(4)}, Lng: {hazard.longitude.toFixed(4)}</span>
                              <span>📅 Reported on {new Date(hazard.created_at).toLocaleDateString()}</span>
                              {hazard.user?.full_name && (
                                <span className="flex items-center gap-1"><Award className="w-3 h-3 text-cyan-400" /> By {hazard.user.full_name}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions buttons */}
                        <div className="flex items-center gap-2 self-end lg:self-center">
                          <button
                            onClick={() => handleSingleVerify(hazard.id)}
                            className="bg-muted hover:bg-muted-foreground/10 border text-foreground font-bold px-3 py-1.5 rounded-lg text-xs transition"
                          >
                            Verify & Award Points
                          </button>
                          <button
                            onClick={() => setAssignCrewModal(hazard)}
                            className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold px-4 py-1.5 rounded-lg text-xs transition shadow-sm"
                          >
                            Assign Crew
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ==================================================== */}
      {/* ACTIVE CREWS TAB                                     */}
      {/* ==================================================== */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" /> Active Repairs & Dispatch Queue
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Track crew dispatches and submit photographic resolution proofs.</p>
              </div>
              <button 
                onClick={fetchActive}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold hover:bg-muted/50 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingActive ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : activeHazards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                  <p className="font-medium text-lg text-foreground">No active dispatches</p>
                  <p className="text-sm">Assign repair crews to verified hazards to get started.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {activeHazards.map((hazard) => (
                    <Card key={hazard.id} className="bg-muted/30 border-border/70 flex flex-col justify-between overflow-hidden relative">
                      <div className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs bg-cyan-500/20 text-cyan-400 font-bold px-2 py-0.5 rounded border border-cyan-500/30 uppercase tracking-wide">
                              Active Crew
                            </span>
                            <h3 className="font-bold text-lg mt-2 uppercase tracking-wide text-foreground">
                              {hazard.hazard_type.replace('_', ' ')}
                            </h3>
                          </div>
                          <span className="bg-primary/20 text-primary font-bold px-2 py-1 rounded text-xs">
                            🚨 Crew: {hazard.assigned_to}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {hazard.description || "No specific details provided."}
                        </p>

                        <div className="bg-background/40 p-3 rounded-lg border border-border/40 text-xs space-y-1 text-muted-foreground">
                          <p>📍 Coordinates: {hazard.latitude.toFixed(4)}, {hazard.longitude.toFixed(4)}</p>
                          {hazard.assigned_at && (
                            <p>⏱️ Dispatched: {new Date(hazard.assigned_at).toLocaleString()}</p>
                          )}
                        </div>
                      </div>

                      <div className="border-t bg-muted/40 p-4 flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground font-semibold">
                          ID: #{hazard.id}
                        </span>
                        <button
                          onClick={() => setResolvingHazard(hazard)}
                          className="bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition shadow-sm flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Resolve Hazard
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}


      {/* ==================================================== */}
      {/* NATIONAL COMMAND TAB (VIP PRESENTATION PORTAL)       */}
      {/* ==================================================== */}
      {activeTab === 'national' && (
        <div className="space-y-6">
          {/* VIP National Alert Banner if Emergency Mode */}
          {isEmergencyMode && (
            <Card className="bg-red-950/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] text-red-100">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Shield className="text-red-500 animate-spin" /> Live Emergency Mobilization Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-red-950/40 p-2.5 rounded border border-red-500/25">
                  <span className="font-bold flex items-center gap-1.5"><Activity className="w-4 h-4 text-red-500" /> Evacuation Route Alpha (I-95 Corridor)</span>
                  <span className="text-xs bg-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded border border-green-500/30">OPEN - 94% FLOW</span>
                </div>
                <div className="flex justify-between items-center bg-red-950/40 p-2.5 rounded border border-red-500/25">
                  <span className="font-bold flex items-center gap-1.5"><Activity className="w-4 h-4 text-red-500" /> Potomac River Bridge Crossing</span>
                  <span className="text-xs bg-yellow-500/20 text-yellow-400 font-bold px-2 py-0.5 rounded border border-yellow-500/30">WARNING - HIGH WINDS</span>
                </div>
                <div className="flex justify-between items-center bg-red-950/40 p-2.5 rounded border border-red-500/25">
                  <span className="font-bold flex items-center gap-1.5"><Activity className="w-4 h-4 text-red-500" /> Baltimore Outer Beltway Flooding</span>
                  <span className="text-xs bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded border border-red-500/30">CLOSED - CREWS ROUTED</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* National Macro Analytics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">National Road Safety Score</CardTitle>
                <Shield className="h-4 w-4 text-cyan-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-cyan-400">
                  {Math.min(98, 72 + Math.round(budget * 0.25))}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Weighted average across all territories</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">National Response Index</CardTitle>
                <Clock className="h-4 w-4 text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-purple-400">3.8 hrs</div>
                <p className="text-xs text-muted-foreground mt-1">Average time from citizen report to dispatch</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">National Mobilization Rate</CardTitle>
                <Activity className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-emerald-400">92.4%</div>
                <p className="text-xs text-muted-foreground mt-1">Active repair crews successfully dispatched</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Interactive Budget ROI Planner */}
            <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-cyan-400" /> Presidential Infrastructure & Budget ROI Simulator
                </CardTitle>
                <p className="text-xs text-muted-foreground">Adjust projected federal/municipal budget to simulate AI-optimized road hazard mitigation ROI.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">Strategic Budget Allocation</span>
                    <span className="text-lg font-extrabold text-cyan-400">${budget} Million USD</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                  />
                  <div className="flex justify-between text-2xs text-muted-foreground">
                    <span>$5M Minimum</span>
                    <span>$100M Maximum</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 bg-background/30 p-4 rounded-xl border border-border/40">
                  <div className="text-center">
                    <p className="text-2xs text-muted-foreground uppercase font-bold tracking-wider">Lives Saved</p>
                    <p className="text-xl font-black text-red-500 mt-1">+{livesSaved}</p>
                  </div>
                  <div className="text-center border-x border-border/30">
                    <p className="text-2xs text-muted-foreground uppercase font-bold tracking-wider">Accidents Prevented</p>
                    <p className="text-xl font-black text-yellow-500 mt-1">+{accidentsPrevented}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xs text-muted-foreground uppercase font-bold tracking-wider">Transit Speed</p>
                    <p className="text-xl font-black text-cyan-400 mt-1">+{speedImprovement}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Eco-Green Carbon Offset Calculator */}
            <Card className="bg-muted/10 backdrop-blur-sm border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-400" /> Green Infrastructure & Carbon-Offset Calculator
                </CardTitle>
                <p className="text-xs text-muted-foreground">Environmental protection metrics calculated by switching to cold-mix and recycled plastic road materials.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-950/10 p-3 rounded-lg border border-emerald-500/25">
                    <span className="text-2xs text-emerald-400 uppercase font-bold tracking-wider">CO2 Offsets</span>
                    <p className="text-2xl font-black text-emerald-400 mt-1">{co2Saved.toLocaleString()} MT</p>
                    <p className="text-3xs text-muted-foreground mt-0.5">Equivalent emissions saved</p>
                  </div>
                  <div className="bg-teal-950/10 p-3 rounded-lg border border-teal-500/25">
                    <span className="text-2xs text-teal-400 uppercase font-bold tracking-wider">Recycled Materials</span>
                    <p className="text-2xl font-black text-teal-400 mt-1">{ecoMaterial.toLocaleString()} Tons</p>
                    <p className="text-3xs text-muted-foreground mt-0.5">Cold-mix & bio-resins utilized</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-muted/20 p-2.5 rounded-lg border border-border/40 text-xs text-muted-foreground">
                  <Leaf className="w-8 h-8 text-emerald-400 flex-shrink-0 animate-bounce" />
                  <p>
                    Strategic budget allocation equivalent to planting <strong className="text-emerald-400 font-extrabold">{treesPlanted.toLocaleString()} fully grown native trees</strong> over 10 years.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: ASSIGN REPAIR CREW                            */}
      {/* ==================================================== */}
      {assignCrewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold flex items-center gap-1.5 text-foreground">
                🔧 Dispatch Repair Crew
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Assign an municipal service crew to hazard #{assignCrewModal.id}</p>
            </div>
            
            <form onSubmit={handleAssignCrew} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Select or Enter Crew Name
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Crew Alpha, Team Blue"
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition"
                  value={crewName}
                  onChange={(e) => setCrewName(e.target.value)}
                />
              </div>

              {/* Autopicker quick select buttons */}
              <div className="space-y-1.5">
                <span className="text-2xs font-bold text-muted-foreground uppercase tracking-widest">Quick Picks</span>
                <div className="flex gap-2 flex-wrap">
                  {['Crew Alpha', 'Team Blue', 'Metro Maintenance', 'Emergency Dispatch'].map(n => (
                    <button 
                      key={n}
                      type="button"
                      className="bg-muted hover:bg-muted-foreground/10 text-foreground text-xs px-2.5 py-1 rounded border transition"
                      onClick={() => setCrewName(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-muted/40 transition"
                  onClick={() => {
                    setAssignCrewModal(null);
                    setCrewName('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !crewName.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-4 py-2 rounded-lg text-xs transition disabled:opacity-50 flex items-center gap-1"
                >
                  {isAssigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Dispatch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: SUBMIT RESOLUTION PROOF                        */}
      {/* ==================================================== */}
      {resolvingHazard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative animate-scaleUp">
            <div className="p-5 border-b">
              <h3 className="text-lg font-bold flex items-center gap-1.5 text-foreground">
                ✅ Submit Resolution Proof
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Upload a photographic proof to finalize resolution of ticket #{resolvingHazard.id}</p>
            </div>
            
            <form onSubmit={handleResolveSubmit} className="p-5 space-y-4">
              {/* Image upload widget */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Upload Repair Image Proof
                </label>
                <div className="flex flex-col items-center justify-center border border-dashed border-border/80 hover:border-cyan-500 rounded-lg p-6 bg-background/50 hover:bg-background/80 transition cursor-pointer relative">
                  <input 
                    type="file" 
                    required
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setResolvedImage(e.target.files[0]);
                      }
                    }}
                  />
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs font-bold text-center text-foreground">
                    {resolvedImage ? resolvedImage.name : "Click to select a photo proof"}
                  </p>
                  <p className="text-2xs text-muted-foreground text-center mt-1">PNG, JPG or JPEG allowed</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Resolution Notes
                </label>
                <textarea 
                  rows={3}
                  placeholder="Provide brief details on the repairs performed..."
                  className="w-full bg-background border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition resize-none"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-bold border hover:bg-muted/40 transition"
                  onClick={() => {
                    setResolvingHazard(null);
                    setResolvedImage(null);
                    setResolutionNotes('');
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving || !resolvedImage}
                  className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  {isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Submit Proof
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
