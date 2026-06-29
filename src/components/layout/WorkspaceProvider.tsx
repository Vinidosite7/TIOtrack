'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useWorkspaceStore } from '@/store/workspace'

export default function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { setList, setActive, active } = useWorkspaceStore()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('workspaces')
        .select('id, nome, slug, moeda')
        .order('created_at', { ascending: true })

      if (!data || data.length === 0) return

      setList(data)
      if (!active) setActive(data[0])
    }
    load()
  }, [])

  return <>{children}</>
}