import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { commissionApi, CommissionRule } from '../api';

export const useCommissionRules = () => {
  return useQuery({
    queryKey: ['commission-rules'],
    queryFn: () => commissionApi.listRules(),
  });
};

export const useCreateCommissionRule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rule: Omit<CommissionRule, 'id'>) => commissionApi.createRule(rule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-rules'] });
      toast.success('Commission rule created');
    },
    onError: () => {
      toast.error('Failed to create commission rule');
    },
  });
};

export const useEmployeeCommissions = (employeeId: string, startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['employee-commissions', employeeId, startDate, endDate],
    queryFn: () => commissionApi.getEmployeeCommissions(employeeId, startDate, endDate),
    enabled: !!employeeId && !!startDate && !!endDate,
  });
};

export const useCommissionReport = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['commission-report', startDate, endDate],
    queryFn: () => commissionApi.generateReport(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
};
