export const RedisStringWdResponse = {
    OK :"OK",
    NIL: null
} as const

export const RedisDeleteWdResponse = {
    FAILED: 0,
    SUCCESS: 1 // 1 or > 1 based on how much keys are deleted
}