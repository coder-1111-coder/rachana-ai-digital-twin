import raw from '../data/portfolio.json'
import type { Kind, Portfolio, Project } from './types'

// Shape is enforced at test time (tests/data.test.js), not by the JSON import.
export const portfolio = raw as unknown as Portfolio
export const projects: Project[] = portfolio.projects

export function projectById(id: string): Project | undefined {
  return projects.find((p) => p.id === id)
}

export function countByKind(kind: Kind): number {
  return projects.filter((p) => p.kind === kind).length
}
