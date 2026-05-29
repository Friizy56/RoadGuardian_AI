import { api } from './api';

export interface Bid {
  id: number;
  hazard_id: number;
  contractor_name: string;
  bid_amount: number;
  estimated_days: number;
  status: string;
  submitted_at: string;
}

export interface BidCreate {
  contractor_name: string;
  bid_amount: number;
  estimated_days: number;
}

export const tenderApi = {
  getAvailableTenders: async () => {
    const response = await api.get('/tenders');
    // Ensure we always return an array
    const data = response.data;
    return Array.isArray(data) ? data : data?.data || [];
  },
  
  submitBid: async (hazardId: number, bidData: BidCreate) => {
    const response = await api.post(`/tenders/${hazardId}/bid`, bidData);
    return response.data;
  },

  getBidsForHazard: async (hazardId: number) => {
    const response = await api.get(`/tenders/${hazardId}/bids`);
    return response.data;
  },

  acceptBid: async (bidId: number) => {
    const response = await api.put(`/tenders/bids/${bidId}/accept`);
    return response.data;
  }
};
