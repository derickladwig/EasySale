import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { layawayApi, CreateLayawayRequest } from '../api';

export const useLayaways = (params?: { customerId?: string; status?: string }) => {
  return useQuery({
    queryKey: ['layaways', params],
    queryFn: () => layawayApi.list(params),
  });
};

export const useLayaway = (id: string) => {
  return useQuery({
    queryKey: ['layaway', id],
    queryFn: () => layawayApi.get(id),
    enabled: !!id,
  });
};

export const useOverdueLayaways = () => {
  return useQuery({
    queryKey: ['layaways', 'overdue'],
    queryFn: () => layawayApi.getOverdue(),
  });
};

export const useCreateLayaway = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLayawayRequest) => layawayApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layaways'] });
      toast.success('Layaway created successfully');
    },
    onError: () => {
      toast.error('Failed to create layaway');
    },
  });
};

export const useLayawayPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, paymentMethod }: { id: string; amount: number; paymentMethod: string }) =>
      layawayApi.recordPayment(id, amount, paymentMethod),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['layaway', id] });
      queryClient.invalidateQueries({ queryKey: ['layaways'] });
      toast.success('Payment recorded successfully');
    },
    onError: () => {
      toast.error('Failed to record payment');
    },
  });
};

export const useCompleteLayaway = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => layawayApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['layaway', id] });
      queryClient.invalidateQueries({ queryKey: ['layaways'] });
      toast.success('Layaway completed');
    },
    onError: () => {
      toast.error('Failed to complete layaway');
    },
  });
};

export const useCancelLayaway = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => layawayApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['layaway', id] });
      queryClient.invalidateQueries({ queryKey: ['layaways'] });
      toast.success('Layaway cancelled');
    },
    onError: () => {
      toast.error('Failed to cancel layaway');
    },
  });
};

export const useCheckOverdueLayaways = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => layawayApi.checkOverdue(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['layaways'] });
      if (data.count > 0) {
        toast.warning(`${data.count} overdue layaways found`);
      }
    },
  });
};
