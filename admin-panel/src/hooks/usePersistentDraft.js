import { useCallback, useEffect, useRef, useState } from 'react'

const PREFIX = 'el-barrio-admin:draft:'

export const hasPersistentDraft = key => {
  if (!key || typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(`${PREFIX}${key}`) != null
  } catch {
    return false
  }
}

const readDraft = (key, fallback, version) => {
  if (!key || typeof window === 'undefined') return fallback
  try {
    const stored = JSON.parse(window.localStorage.getItem(`${PREFIX}${key}`))
    if (!stored || stored.version !== version || stored.value == null) return fallback
    return stored.value
  } catch {
    return fallback
  }
}

export default function usePersistentDraft(key, fallback, version = '1') {
  const identity = `${key || ''}:${version}`
  const identityRef = useRef(identity)
  const [value, setValue] = useState(() => readDraft(key, fallback, version))
  const lastValueRef = useRef(value)
  const skipNextWriteRef = useRef(false)

  useEffect(() => {
    if (identityRef.current !== identity) {
      identityRef.current = identity
      const restored = readDraft(key, fallback, version)
      lastValueRef.current = restored
      setValue(restored)
      return
    }
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false
      lastValueRef.current = value
      return
    }
    if (Object.is(lastValueRef.current, value)) return
    lastValueRef.current = value
    if (!key || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(`${PREFIX}${key}`, JSON.stringify({
        version,
        savedAt: new Date().toISOString(),
        value,
      }))
    } catch {
      // El formulario sigue funcionando aunque el navegador bloquee Storage.
    }
  }, [fallback, identity, key, value, version])

  const clearDraft = useCallback(() => {
    if (!key || typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(`${PREFIX}${key}`)
    } catch {
      // Sin acción: el guardado principal no depende del borrador local.
    }
  }, [key])

  const replaceWithoutSaving = useCallback(nextValue => {
    skipNextWriteRef.current = true
    setValue(nextValue)
  }, [])

  return [value, setValue, clearDraft, replaceWithoutSaving]
}
