declare module '@tauri-apps/api/core' {
  export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>
  export class Channel<T> {
    onmessage?: (event: T) => void
  }
}