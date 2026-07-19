import { useState, useEffect } from 'react'

export function usePush() {
  const [supported, setSupported]   = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading]       = useState(false)

  const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY ?? ''

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
  }

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setSupported(true)
      setPermission(Notification.permission)
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
      })
    }
  }, [])

  async function subscribe(workspaceId: string) {
    if (!supported || !VAPID_KEY) return false
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') { setLoading(false); return false }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
      })
      await fetch('/api/push', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId, subscription: sub.toJSON() }),
      })
      setSubscribed(true)
      setLoading(false)
      return true
    } catch (err) {
      console.error('Push subscribe error:', err)
      setLoading(false)
      return false
    }
  }

  async function unsubscribe(workspaceId: string) {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspace_id: workspaceId, endpoint: sub.endpoint }),
        })
      }
      setSubscribed(false)
    } finally { setLoading(false) }
  }

  return { supported, permission, subscribed, loading, subscribe, unsubscribe }
}
