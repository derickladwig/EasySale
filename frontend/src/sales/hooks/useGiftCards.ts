import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { giftCardApi } from '../api';

export const useGiftCardBalance = (code: string) => {
  return useQuery({
    queryKey: ['gift-card-balance', code],
    queryFn: () => giftCardApi.checkBalance(code),
    enabled: !!code && code.length >= 8,
  });
};

export const useIssueGiftCard = () => {
  return useMutation({
    mutationFn: ({ amount, customerId }: { amount: number; customerId?: string }) =>
      giftCardApi.issue(amount, customerId),
    onSuccess: (data) => {
      toast.success(`Gift card issued: ${data.code}`);
    },
    onError: () => {
      toast.error('Failed to issue gift card');
    },
  });
};

export const useRedeemGiftCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, amount, transactionId }: { code: string; amount: number; transactionId?: string }) =>
      giftCardApi.redeem(code, amount, transactionId),
    onSuccess: (_, { code }) => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-balance', code] });
      toast.success('Gift card redeemed');
    },
    onError: () => {
      toast.error('Failed to redeem gift card');
    },
  });
};

export const useReloadGiftCard = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ code, amount }: { code: string; amount: number }) =>
      giftCardApi.reload(code, amount),
    onSuccess: (_, { code }) => {
      queryClient.invalidateQueries({ queryKey: ['gift-card-balance', code] });
      toast.success('Gift card reloaded');
    },
    onError: () => {
      toast.error('Failed to reload gift card');
    },
  });
};
