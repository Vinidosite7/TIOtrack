import { create } from 'zustand'

export type Workspace = {
  id: string
  nome: string
  slug: string
  moeda: string
}

type WorkspaceStore = {
  active: Workspace | null
  list: Workspace[]
  setActive: (w: Workspace) => void
  setList: (list: Workspace[]) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  active: null,
  list: [],
  setActive: (w) => set({ active: w }),
  setList: (list) => set({ list }),
}))