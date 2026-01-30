import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { promotionApi, Promotion, GroupMarkdown } from '../api';

export const usePromotions = (params?: { isActive?: boolean }) => {
  return useQuery({
    queryKey: ['promotions', params],
    queryFn: () => promotionApi.list(params),
  });
};

export const useCreatePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (promotion: Omit<Promotion, 'id' | 'usageCount'>) => promotionApi.create(promotion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promotion created');
    },
    onError: () => {
      toast.error('Failed to create promotion');
    },
  });
};

export const useUpdatePromotion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Promotion> }) =>
      promotionApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast.success('Promotion updated');
    },
    onError: () => {
      toast.error('Failed to update promotion');
    },
  });
};

export const usePromotionUsage = (id: string) => {
  return useQuery({
    queryKey: ['promotion-usage', id],
    queryFn: () => promotionApi.getUsage(id),
    enabled: !!id,
  });
};

export const useEvaluatePromotions = () => {
  return useMutation({
    mutationFn: (cartItems: Array<{ productId: string; quantity: number; price: number }>) =>
      promotionApi.evaluate(cartItems),
  });
};

export const useGroupMarkdowns = () => {
  return useQuery({
    queryKey: ['group-markdowns'],
    queryFn: () => promotionApi.listGroupMarkdowns(),
  });
};

export const useCreateGroupMarkdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (markdown: Omit<GroupMarkdown, 'id'>) => promotionApi.createGroupMarkdown(markdown),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-markdowns'] });
      toast.success('Group markdown created');
    },
    onError: () => {
      toast.error('Failed to create group markdown');
    },
  });
};

export const useDeactivateGroupMarkdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => promotionApi.deactivateGroupMarkdown(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-markdowns'] });
      toast.success('Group markdown deactivated');
    },
    onError: () => {
      toast.error('Failed to deactivate group markdown');
    },
  });
};
