// Tiny nanoid replacement — no dependency needed
export const nanoid = () => Math.random().toString(36).slice(2, 10)
