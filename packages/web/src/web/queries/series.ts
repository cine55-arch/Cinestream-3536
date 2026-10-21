import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../lib/api';

export function useSeries() { return useQuery(orpc.series.list.queryOptions()); }
export function useSeriesDetail(id: string) { return useQuery(orpc.series.get.queryOptions({ input: { id }, enabled: !!id })); }
export function useEpisodePlayback(id: string, enabled: boolean) { return useQuery(orpc.series.playback.queryOptions({ input: { id }, enabled, retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always' })); }
function useRefreshSeries() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: orpc.series.key() });
}
export function useCreateSeries() { return useMutation(orpc.series.create.mutationOptions({ onSuccess: useRefreshSeries() })); }
export function useUpdateSeries() { return useMutation(orpc.series.update.mutationOptions({ onSuccess: useRefreshSeries() })); }
export function useRemoveSeries() { return useMutation(orpc.series.remove.mutationOptions({ onSuccess: useRefreshSeries() })); }
export function useSaveSeason() { return useMutation(orpc.series.saveSeason.mutationOptions({ onSuccess: useRefreshSeries() })); }
export function useRemoveSeason() { return useMutation(orpc.series.removeSeason.mutationOptions({ onSuccess: useRefreshSeries() })); }
export function useSaveEpisode() { return useMutation(orpc.series.saveEpisode.mutationOptions({ onSuccess: useRefreshSeries() })); }
export function useRemoveEpisode() { return useMutation(orpc.series.removeEpisode.mutationOptions({ onSuccess: useRefreshSeries() })); }
export type Series = NonNullable<ReturnType<typeof useSeries>['data']>[number];
export type SeriesDetail = NonNullable<ReturnType<typeof useSeriesDetail>['data']>;
export type Season = SeriesDetail['seasons'][number];
export type Episode = Season['episodes'][number];