import { spa } from '../lib/spa.ts'

export function onRequestGet(context: { request: Request }) {
  return spa(context.request)
}
