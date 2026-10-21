import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../lib/api';

export function useTopFive() { return useQuery(orpc.topFive.get.queryOptions()); }
export function useSaveTopFive() {
  const queryClient = useQueryClient();
  return useMutation(orpc.topFive.save.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.topFive.key() }) }));
}
export function useRecordView() {
  const queryClient = useQueryClient();
  return useMutation(orpc.topFive.recordView.mutationOptions({ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.topFive.key() }) }));
}