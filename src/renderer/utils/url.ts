export const normalizeUrl = (value: string): string => {
  const trimmed = value.trim()

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`
  }

  return trimmed
}

export const isValidUrl = (value: string): boolean => {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}
