'use client';

import { create } from 'zustand';
import { canteenOperationsApi, type CanteenStatus } from '../api/operations.api';

type OperationState = {
  scopeKey: string | null;
  status: CanteenStatus | null;
  loading: boolean;
  updating: boolean;
  error: string | null;
};
type OperationStore = OperationState & {
  refresh: (scopeKey: string) => Promise<CanteenStatus | null>;
  setOpen: (scopeKey: string, isOpen: boolean) => Promise<CanteenStatus>;
  reset: () => void;
};

const initialState: OperationState = { scopeKey: null, status: null, loading: false, updating: false, error: null };
type PendingRequest = { scopeKey: string; revision: number; promise: Promise<CanteenStatus | null> };
let revision = 0;
let pendingRead: PendingRequest | null = null;
let pendingWrite: PendingRequest | null = null;

function validStatus(status: CanteenStatus) {
  if (!status || typeof status.isOpen !== 'boolean') throw new Error('Resposta inválida ao consultar a cantina.');
  return status;
}

/** Estado operacional único e não persistido, isolado por tenant/usuário.
 * Respostas anteriores a uma mutação ou troca de sessão nunca substituem o estado atual. */
export const useCanteenOperationStore = create<OperationStore>((set, get) => {
  const activate = (scopeKey: string) => {
    if (get().scopeKey === scopeKey) return;
    revision += 1;
    pendingRead = null;
    pendingWrite = null;
    set({ ...initialState, scopeKey });
  };
  const current = (scopeKey: string, requestRevision: number) => get().scopeKey === scopeKey && revision === requestRevision;

  return {
    ...initialState,
    reset: () => {
      revision += 1;
      pendingRead = null;
      pendingWrite = null;
      set(initialState);
    },
    refresh: (scopeKey) => {
      activate(scopeKey);
      if (pendingWrite?.scopeKey === scopeKey) return pendingWrite.promise.catch(() => null);
      if (pendingRead?.scopeKey === scopeKey && pendingRead.revision === revision) return pendingRead.promise;
      const requestRevision = ++revision;
      set({ loading: true, error: null });
      const request: PendingRequest = { scopeKey, revision: requestRevision, promise: Promise.resolve(null) };
      request.promise = Promise.resolve().then(() => canteenOperationsApi.status()).then(validStatus).then((status) => {
        if (!current(scopeKey, requestRevision)) return get().scopeKey === scopeKey && !get().updating && !get().error ? get().status : null;
        set({ status, error: null });
        return status;
      }).catch(() => {
        if (current(scopeKey, requestRevision)) set({ error: 'Não foi possível confirmar o status da cantina. Tente novamente.' });
        return null;
      }).finally(() => {
        if (current(scopeKey, requestRevision)) set({ loading: false });
        if (pendingRead === request) pendingRead = null;
      });
      pendingRead = request;
      return request.promise;
    },
    setOpen: async (scopeKey, isOpen) => {
      activate(scopeKey);
      if (pendingWrite?.scopeKey === scopeKey) {
        const status = await pendingWrite.promise;
        if (!status) throw new Error('Não foi possível alterar o status da cantina.');
        return status;
      }
      const requestRevision = ++revision;
      set({ updating: true, loading: false, error: null });
      const request: PendingRequest = { scopeKey, revision: requestRevision, promise: Promise.resolve(null) };
      request.promise = Promise.resolve().then(() => canteenOperationsApi.setStatus(isOpen)).then(validStatus).then((status) => {
        if (current(scopeKey, requestRevision)) set({ status, error: null });
        return status;
      }).catch((error: unknown) => {
        if (current(scopeKey, requestRevision)) set({ error: 'Não foi possível confirmar a alteração da cantina. Atualize o status.' });
        throw error;
      }).finally(() => {
        if (current(scopeKey, requestRevision)) set({ updating: false });
        if (pendingWrite === request) pendingWrite = null;
      });
      pendingWrite = request;
      return (await request.promise)!;
    },
  };
});
