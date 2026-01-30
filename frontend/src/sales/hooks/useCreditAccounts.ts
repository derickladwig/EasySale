import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { creditApi } from '../api';

export const useCreditAccount = (id: string) => {
  return useQuery({
    queryKey: ['credit-account', id],
    queryFn: () => creditApi.get(id),
    enabled: !!id,
  });
};

export const useCreateCreditAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, creditLimit, paymentTerms }: {
      customerId: string;
      creditLimit: number;
      paymentTerms: number;
    }) => creditApi.create(customerId, creditLimit, paymentTerms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-accounts'] });
      toast.success('Credit account created');
    },
    onError: () => {
      toast.error('Failed to create credit account');
    },
  });
};

export const useRecordCharge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, reference }: { id: string; amount: number; reference?: string }) =>
      creditApi.recordCharge(id, amount, reference),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['credit-account', id] });
      toast.success('Charge recorded');
    },
    onError: () => {
      toast.error('Failed to record charge');
    },
  });
};


export const useRecordPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, reference }: { id: string; amount: number; reference?: string }) =>
      creditApi.recordPayment(id, amount, reference),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['credit-account', id] });
      toast.success('Payment recorded');
    },
    onError: () => {
      toast.error('Failed to record payment');
    },
  });
};

export const useCreditStatement = (id: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['credit-statement', id, startDate, endDate],
    queryFn: () => creditApi.generateStatement(id, startDate, endDate),
    enabled: !!id && !!startDate && !!endDate,
  });
};

export const useAgingReport = () => {
  return useQuery({
    queryKey: ['aging-report'],
    queryFn: () => creditApi.getAgingReport(),
  });
};

export const useCheckCredit = () => {
  return useMutation({
    mutationFn: ({ customerId, amount }: { customerId: string; amount: number }) =>
      creditApi.checkCredit(customerId, amount),
  });
};

export const usePendingVerifications = () => {
  return useQuery({
    queryKey: ['pending-verifications'],
    queryFn: () => creditApi.getPendingVerifications(),
  });
};

export const useVerifyOfflineTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionIds: string[]) => creditApi.verifyOfflineTransactions(transactionIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-verifications'] });
      toast.success('Transactions verified');
    },
    onError: () => {
      toast.error('Failed to verify transactions');
    },
  });
};
