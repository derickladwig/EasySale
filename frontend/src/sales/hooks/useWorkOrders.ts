import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { workOrderApi, WorkOrder, CreateWorkOrderRequest, WorkOrderLine } from '../api';

export const useWorkOrders = (params?: { status?: string; customerId?: string }) => {
  return useQuery({
    queryKey: ['work-orders', params],
    queryFn: () => workOrderApi.list(params),
  });
};

export const useWorkOrder = (id: string) => {
  return useQuery({
    queryKey: ['work-order', id],
    queryFn: () => workOrderApi.get(id),
    enabled: !!id,
  });
};

export const useCreateWorkOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateWorkOrderRequest) => workOrderApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order created');
    },
    onError: () => {
      toast.error('Failed to create work order');
    },
  });
};

export const useUpdateWorkOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkOrder> }) =>
      workOrderApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order updated');
    },
    onError: () => {
      toast.error('Failed to update work order');
    },
  });
};

export const useAddWorkOrderLine = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, line }: { id: string; line: Omit<WorkOrderLine, 'id' | 'total'> }) =>
      workOrderApi.addLine(id, line),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      toast.success('Line item added');
    },
    onError: () => {
      toast.error('Failed to add line item');
    },
  });
};

export const useCompleteWorkOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workOrderApi.complete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['work-order', id] });
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast.success('Work order completed');
    },
    onError: () => {
      toast.error('Failed to complete work order');
    },
  });
};
