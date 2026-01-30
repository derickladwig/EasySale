import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { loyaltyApi } from '../api';

export const useLoyaltyBalance = (customerId: string) => {
  return useQuery({
    queryKey: ['loyalty-balance', customerId],
    queryFn: () => loyaltyApi.getBalance(customerId),
    enabled: !!customerId,
  });
};

export const useRedeemLoyaltyPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, points, transactionId }: {
      customerId: string;
      points: number;
      transactionId?: string;
    }) => loyaltyApi.redeemPoints(customerId, points, transactionId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-balance', customerId] });
      toast.success('Points redeemed');
    },
    onError: () => {
      toast.error('Failed to redeem points');
    },
  });
};

export const useAdjustLoyaltyPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, points, reason }: {
      customerId: string;
      points: number;
      reason: string;
    }) => loyaltyApi.adjustPoints(customerId, points, reason),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-balance', customerId] });
      toast.success('Points adjusted');
    },
    onError: () => {
      toast.error('Failed to adjust points');
    },
  });
};


export const useAdjustLoyaltyTier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, tier }: { customerId: string; tier: string }) =>
      loyaltyApi.adjustTier(customerId, tier),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-balance', customerId] });
      toast.success('Tier updated');
    },
    onError: () => {
      toast.error('Failed to update tier');
    },
  });
};

export const usePriceLevels = () => {
  return useQuery({
    queryKey: ['price-levels'],
    queryFn: () => loyaltyApi.getPriceLevels(),
  });
};

export const useCreatePriceLevel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (level: { name: string; discountPercentage: number; minPurchaseAmount?: number; isDefault: boolean }) =>
      loyaltyApi.createPriceLevel(level),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-levels'] });
      toast.success('Price level created');
    },
    onError: () => {
      toast.error('Failed to create price level');
    },
  });
};

export const useStoreCreditBalance = (customerId: string) => {
  return useQuery({
    queryKey: ['store-credit-balance', customerId],
    queryFn: () => loyaltyApi.getStoreCreditBalance(customerId),
    enabled: !!customerId,
  });
};

export const useIssueStoreCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, amount, reason }: {
      customerId: string;
      amount: number;
      reason: string;
    }) => loyaltyApi.issueStoreCredit(customerId, amount, reason),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['store-credit-balance', customerId] });
      toast.success('Store credit issued');
    },
    onError: () => {
      toast.error('Failed to issue store credit');
    },
  });
};

export const useRedeemStoreCredit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, amount, transactionId }: {
      customerId: string;
      amount: number;
      transactionId?: string;
    }) => loyaltyApi.redeemStoreCredit(customerId, amount, transactionId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: ['store-credit-balance', customerId] });
      toast.success('Store credit redeemed');
    },
    onError: () => {
      toast.error('Failed to redeem store credit');
    },
  });
};
