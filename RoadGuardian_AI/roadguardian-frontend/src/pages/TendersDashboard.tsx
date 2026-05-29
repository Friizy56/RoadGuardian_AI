import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenderApi, Bid } from '@/services/tenderApi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { BidModal } from '@/components/tender/BidModal';
import { AlertTriangle, Clock, CheckCircle2, MapPin, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

export function TendersDashboard() {
  const [selectedHazardId, setSelectedHazardId] = useState<number | null>(null);
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ['tenders'],
    queryFn: tenderApi.getAvailableTenders,
  });

  const acceptBidMutation = useMutation({
    mutationFn: (bidId: number) => tenderApi.acceptBid(bidId),
    onSuccess: () => {
      toast.success('Bid accepted successfully');
      queryClient.invalidateQueries({ queryKey: ['tenders'] });
    },
    onError: () => {
      toast.error('Failed to accept bid');
    }
  });

  const handleOpenBidModal = (hazardId: number) => {
    setSelectedHazardId(hazardId);
    setIsBidModalOpen(true);
  };

  const handleBidSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['tenders'] });
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="animate-pulse text-primary font-bold text-xl">Loading Tenders...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Active Tenders</h1>
          <p className="text-muted-foreground mt-2">Manage critical infrastructure repair bids.</p>
        </div>
      </div>

      {tenders?.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <CheckCircle2 className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-xl font-medium text-foreground">No Active Tenders</h3>
          <p className="text-muted-foreground mt-2">All critical hazards have been assigned or there are currently no critical hazards.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenders?.map((hazard: any) => (
            <Card key={hazard.id} className="overflow-hidden hover:shadow-lg transition-all border-destructive/20 bg-gradient-to-b from-card to-card/90">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                      {hazard.hazard_type}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock size={12} className="mr-1" />
                      {new Date(hazard.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center text-amber-500 font-bold bg-amber-500/10 px-2 py-1 rounded-md text-sm">
                    <AlertTriangle size={16} className="mr-1" />
                    Sev: {hazard.severity_score.toFixed(1)}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-foreground/80 line-clamp-2">
                    {hazard.description || "No description provided."}
                  </p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3">
                    <div className="flex items-center">
                      <MapPin size={12} className="mr-1" />
                      Lat: {hazard.latitude.toFixed(4)}, Lng: {hazard.longitude.toFixed(4)}
                    </div>
                    {hazard.budget_estimate && (
                      <div className="flex items-center font-bold text-[#138808] bg-[#138808]/10 px-2 py-1 rounded-sm border border-[#138808]/20">
                        <Calculator size={12} className="mr-1" />
                        AI Est: ₹{hazard.budget_estimate.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-border pt-4 mt-2">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-semibold">Contractor Bids ({hazard.bids?.length || 0})</span>
                    <Button size="sm" variant="outline" onClick={() => handleOpenBidModal(hazard.id)}>
                      Submit Bid
                    </Button>
                  </div>
                  
                  {hazard.bids && hazard.bids.length > 0 ? (
                    <div className="space-y-3 mt-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {hazard.bids.map((bid: Bid) => (
                        <div key={bid.id} className="bg-muted/50 rounded-lg p-3 border border-border">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium text-sm">{bid.contractor_name}</span>
                            <span className="text-sm font-bold text-primary">₹{bid.bid_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">{bid.estimated_days} days estimated</span>
                            {bid.status === 'pending' ? (
                              <Button 
                                size="sm" 
                                className="h-6 text-xs px-2"
                                onClick={() => acceptBidMutation.mutate(bid.id)}
                                disabled={acceptBidMutation.isPending}
                              >
                                Accept
                              </Button>
                            ) : (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                bid.status === 'accepted' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'
                              }`}>
                                {bid.status.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                      No bids submitted yet
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedHazardId && (
        <BidModal 
          isOpen={isBidModalOpen} 
          hazardId={selectedHazardId} 
          onClose={() => setIsBidModalOpen(false)} 
          onSuccess={handleBidSuccess}
        />
      )}
    </div>
  );
}
