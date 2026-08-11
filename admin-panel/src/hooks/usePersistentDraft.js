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

const writeDraft = (key, version, value) => {
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
}

export default function usePersistentDraft(key, fallback, version = '1') {
  const identity = `${key || ''}:${version}`
  const identityRef = useRef(identity)
  const [value, setValue] = useState(() => readDraft(key, fallback, version))
  const skipNextWriteRef = useRef(false)

  useEffect(() => {
    if (identityRef.current !== identity) {
      identityRef.current = identity
      const restored = readDraft(key, fallback, version)
      setValue(restored)
    }
  }, [fallback, identity, key, version])

  // Persistir dentro del mismo cambio evita perder la última edición si el
  // usuario abandona la pestaña antes de que React alcance a ejecutar un efecto.
  const setPersistentValue = useCallback(nextValue => {
    setValue(currentValue => {
      const resolvedValue = typeof nextValue === 'function' ? nextValue(currentValue) : nextValue
      if (!skipNextWriteRef.current) writeDraft(key, version, resolvedValue)
      skipNextWriteRef.current = false
      return resolvedValue
    })
  }, [key, version])

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
    setPersistentValue(nextValue)
  }, [setPersistentValue])

  return [value, setPersistentValue, clearDraft, replaceWithoutSaving]
}
