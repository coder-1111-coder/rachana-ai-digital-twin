export type Kind = 'ml' | 'fullstack' | 'interactive'

export interface DatasetFact {
  label: string
  value: string
}

export type NetworkLayer =
  | { type: 'input'; label: string }
  | { type: 'dense'; units: number; activation: string }
  | { type: 'dropout'; rate: number }

export interface MlStudy {
  problem: string
  dataset: DatasetFact[]
  classBalance?: { label: string; percent: number; approximate: boolean }
  pipelineOrdered: boolean
  pipelineLabel?: string
  pipelineHighlights?: number[]
  pipeline: string[]
  network?: NetworkLayer[]
  models: string[]
  evaluation: string[]
  outputs: string[]
  decisions: string[]
  resultsNote?: string
}

export interface Layer {
  stack: string[]
  notes: string[]
}

export type LayerName = 'frontend' | 'backend' | 'database' | 'ai' | 'auth'

export interface FullstackStudy {
  problem: string
  layers: Record<LayerName, Layer>
  featureGroups: { label: string; items: string[] }[]
  notSpecified: string[]
}

export interface InteractiveStudy {
  problem: string
  flow: string[]
  dataNotice: string
  geography: string
  story: { label: string }[]
  notSpecified: string[]
}

interface ProjectBase {
  id: string
  number: string
  title: string
  shortTitle: string
  repoUrl: string | null
  driveUrl: string | null
  kindLabel: string
  aliases: string[]
  summary: string
  stack: string[]
}

export type Project =
  | (ProjectBase & { kind: 'ml'; study: MlStudy })
  | (ProjectBase & { kind: 'fullstack'; study: FullstackStudy })
  | (ProjectBase & { kind: 'interactive'; study: InteractiveStudy })

export interface SkillItem {
  name: string
  projects: string[]
  terms?: string[]
}

export interface Portfolio {
  owner: { name: string; status: string; headline: string; lede: string }
  about: { paragraphs: string[]; notPublished: string }
  site: { stack: string[]; repoUrl: string | null }
  projects: Project[]
  learning: {
    note: string
    tracks: { id: string; label: string; title: string; text: string; projects: string[] }[]
  }
  skills: { group: string; items: SkillItem[] }[]
  unknowns: string[]
  twin: { intro: string; suggestedQuestions: string[] }
  contact: { email: string | null; github: string | null; linkedin: string | null }
}
