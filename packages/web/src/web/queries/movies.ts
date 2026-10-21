import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orpc } from '../lib/api';
export function useMovies() { return useQuery(orpc.movies.list.queryOptions()); }
export function useAccess(enabled: boolean) { return useQuery(orpc.movies.access.queryOptions({ enabled, retry: false })); }
export function usePlayback(id: string, enabled = true) { return useQuery(orpc.movies.playback.queryOptions({ input: { id }, enabled, retry: false, staleTime: 0, gcTime: 0, refetchOnMount: "always" })); }
export function useCreateMovie() { const qc = useQueryClient(); return useMutation(orpc.movies.create.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.movies.key() }) })); }
export function useRemoveMovie() { const qc = useQueryClient(); return useMutation(orpc.movies.remove.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.movies.key() }) })); }
export type Movie = NonNullable<ReturnType<typeof useMovies>['data']>[number];
export function useUpdateMovie() { const qc = useQueryClient(); return useMutation(orpc.movies.update.mutationOptions({ onSuccess: () => qc.invalidateQueries({ queryKey: orpc.movies.key() }) })); }
