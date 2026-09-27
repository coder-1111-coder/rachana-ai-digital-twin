import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { loadPortfolio } from '../server/portfolio.js'

const portfolio = loadPortfolio()
const source = readFileSync(new URL('../docs/PORTFOLIO-SOURCE-OF-TRUTH.md', import.meta.url), 'utf8')
const sourceLower = source.toLowerCase()

/** Every string value in `value`, recursively. */
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
  return out
}

const inSource = (term) => sourceLower.includes(term.toLowerCase())
const numbersIn = (text) => text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []

// User-visible copy. `unknowns` and the "not published" notices are excluded on purpose:
// they name things that are absent, so they legitimately mention GPA, awards, etc.
const visibleCopy = strings({
  owner: portfolio.owner,
  about: { paragraphs: portfolio.about.paragraphs },
  projects: portfolio.projects.map(({ summary, stack, study }) => ({ summary, stack, study })),
  learning: portfolio.learning.tracks,
})

describe('portfolio.json structure', () => {
  it('has the six verified projects in order with unique ids', () => {
    assert.deepEqual(
      portfolio.projects.map((p) => p.title),
      [
        'PCA + ANN Face Recognition System',
        'Hazardous Asteroid Prediction',
        'Employee Attrition + Salary Prediction',
        'Symbio-NLM',
        'Space Atlas',
        'Memory of a City',
      ],
    )
    assert.equal(new Set(portfolio.projects.map((p) => p.id)).size, 6)
    assert.deepEqual(portfolio.projects.map((p) => p.number), ['01', '02', '03', '04', '05', '06'])
  })

  it('gives every project the fields its case-study layout needs', () => {
    for (const p of portfolio.projects) {
      assert.ok(['ml', 'fullstack', 'interactive'].includes(p.kind), p.id)
      assert.ok(p.summary && p.aliases.length, p.id)
      if (p.kind !== 'interactive') assert.ok(p.stack.length, p.id + ' needs a listed stack')
      const s = p.study
      assert.ok(s.problem, p.id)
      if (p.kind === 'ml') {
        for (const key of ['dataset', 'pipeline', 'models', 'evaluation', 'decisions']) assert.ok(s[key]?.length, `${p.id}.${key}`)
      } else if (p.kind === 'fullstack') {
        for (const layer of ['frontend', 'backend', 'database', 'ai', 'auth']) assert.ok(s.layers[layer], `${p.id}.${layer}`)
        assert.ok(s.featureGroups.length && s.notSpecified.length, p.id)
      } else {
        assert.ok(s.flow.length && s.story.length === 3 && s.dataNotice && s.geography, p.id)
      }
    }
  })

  it('references only existing project ids in skills and learning tracks', () => {
    const ids = new Set(portfolio.projects.map((p) => p.id))
    for (const group of portfolio.skills) for (const item of group.items) for (const id of item.projects) assert.ok(ids.has(id), `${item.name} -> ${id}`)
    for (const track of portfolio.learning.tracks) for (const id of track.projects) assert.ok(ids.has(id), `${track.id} -> ${id}`)
  })

  it('offers the required example questions to the twin', () => {
    const q = portfolio.twin.suggestedQuestions.join('\n')
    for (const needle of ['What projects has Rachana built', 'asteroid project', 'ML techniques', 'face recognition pipeline', 'full-stack projects', 'authentication', 'class imbalance']) {
      assert.match(q, new RegExp(needle, 'i'))
    }
  })
})

describe('portfolio.json is derivable from the source of truth', () => {
  it('every number in the visible copy appears in the source document', () => {
    const allowed = new Set(numbersIn(source))
    for (const text of visibleCopy) {
      for (const n of numbersIn(text)) assert.ok(allowed.has(n), `number "${n}" in "${text}" is not in PORTFOLIO-SOURCE-OF-TRUTH.md`)
    }
  })

  it('every listed technology appears in the source document', () => {
    for (const p of portfolio.projects) {
      for (const tech of p.stack) assert.ok(inSource(tech), `${p.id}: ${tech}`)
      for (const layer of Object.values(p.study.layers ?? {})) for (const tech of layer.stack) assert.ok(inSource(tech), `${p.id} layer: ${tech}`)
    }
    for (const tech of portfolio.site.stack) assert.ok(inSource(tech), `site: ${tech}`)
  })

  it('every skill is backed by a term in the source document', () => {
    for (const group of portfolio.skills) {
      for (const item of group.items) {
        const terms = item.terms ?? [item.name]
        assert.ok(terms.some(inSource), `skill "${item.name}" has no support in the source (looked for ${terms.join(', ')})`)
      }
    }
  })

  it('each skill is attributed only to a project whose source section mentions it', () => {
    const sections = source.split(/^### \d+\. /m).slice(1)
    assert.equal(sections.length, 6)
    for (const group of portfolio.skills) {
      for (const item of group.items) {
        const terms = item.terms ?? [item.name]
        for (const id of item.projects) {
          const section = sections[portfolio.projects.findIndex((p) => p.id === id)].toLowerCase()
          for (const t of terms) assert.ok(section.includes(t.toLowerCase()), `"${item.name}" is attributed to ${id}, but that source section does not mention "${t}"`)
        }
      }
    }
  })

  it('face-recognition pipeline keeps the source order', () => {
    const keywords = ['image loading', 'grayscale', '100x100', 'flatten', 'mean face', 'mean subtraction', 'surrogate covariance', 'eigen decomposition', 'eigenfaces', 'pca signatures', '60/40 stratified split', 'ann', 'evaluation']
    const steps = portfolio.projects[0].study.pipeline
    assert.equal(steps.length, keywords.length)
    let cursor = sourceLower.indexOf('image loading')
    keywords.forEach((keyword, i) => {
      assert.ok(steps[i].toLowerCase().includes(keyword), `step ${i}: "${steps[i]}" vs ${keyword}`)
      const at = sourceLower.indexOf(keyword, cursor)
      assert.ok(at >= cursor, `"${keyword}" is out of order in the source`)
      cursor = at
    })
  })

  it('asteroid workflow keeps the source order', () => {
    const keywords = ['missing-value analysis', 'duplicate analysis', 'zero-variance', 'feature engineering', 'leakage-safe grouped', 'smote', '9 classification', 'accuracy', 'gradient boosting', 'feature importance', 'joblib', 'prediction interface']
    const steps = portfolio.projects[1].study.pipeline.map((s) => s.toLowerCase())
    const workflow = sourceLower.slice(sourceLower.indexOf('### 2.'), sourceLower.indexOf('### 3.'))
    let lastStep = -1
    let cursor = 0
    for (const keyword of keywords) {
      const stepIndex = steps.findIndex((s, idx) => idx > lastStep && s.includes(keyword))
      assert.ok(stepIndex > lastStep, `asteroid step for "${keyword}" is missing or out of order`)
      lastStep = stepIndex
      const at = workflow.indexOf(keyword, cursor)
      assert.ok(at >= cursor, `"${keyword}" is out of order in the source`)
      cursor = at
    }
  })

  it('keeps the approximate figures marked approximate', () => {
    const values = portfolio.projects[1].study.dataset.map((d) => d.value)
    for (const needle of ['90,836', '27,423', '9.7%']) {
      assert.match(values.find((v) => v.includes(needle)), /approximately/, needle)
    }
  })

  it('flags Memory of a City metrics as demo data and never as verified', () => {
    const memory = portfolio.projects.find((p) => p.id === 'memory-of-a-city')
    assert.match(memory.study.dataNotice, /DEMO DATA/)
    assert.match(memory.study.dataNotice, /not verified real-world measurements/)
    assert.match(memory.summary, /demo data/i)
    assert.doesNotMatch(strings(memory).join(' '), /\b(?:is|are) verified\b/i)
  })
})

describe('no invented claims in the visible copy', () => {
  it('contains none of the categories the source says are unknown', () => {
    const forbidden = [/\bGPA\b/i, /\bCGPA\b/i, /\bintern(ship)?s?\b/i, /\bcertifi/i, /\bhackathon/i, /\bawards?\b/i, /\bscholarship/i, /\bpatent/i, /\bpublications?\b/i, /\bemployed\b/i, /\bworked at\b/i]
    for (const text of visibleCopy) {
      for (const pattern of forbidden) assert.doesNotMatch(text, pattern, `"${text}" matches ${pattern}`)
    }
  })

  it('contains no percentage that the source does not contain', () => {
    const sourcePercents = new Set(source.match(/\d+(?:\.\d+)?%/g))
    for (const text of visibleCopy) {
      for (const pct of text.match(/\d+(?:\.\d+)?%/g) ?? []) assert.ok(sourcePercents.has(pct), `"${pct}" in "${text}"`)
    }
  })

  it('lists only the owner-verified contact details', () => {
    assert.deepEqual(Object.keys(portfolio.contact).sort(), ['email', 'github', 'linkedin'])
    assert.equal(portfolio.contact.email, 'rachana00526@gmail.com')
    assert.equal(portfolio.contact.linkedin, 'https://www.linkedin.com/in/rachana-s-21b931331/')
    assert.equal(portfolio.contact.github, null, 'no personal GitHub profile was verified')
  })
})

describe('unknowns, contact details and copy discipline', () => {
  it('repeats the source document unknowns list verbatim', () => {
    assert.ok(portfolio.unknowns.length >= 15)
    for (const line of portfolio.unknowns) assert.ok(source.includes('- ' + line), `unknown not in the source document: ${line}`)
  })

  it('any contact, repository or Drive-materials value that is set must appear in the source document', () => {
    const values = [
      ...Object.values(portfolio.contact),
      portfolio.site.repoUrl,
      ...portfolio.projects.map((p) => p.repoUrl),
      ...portfolio.projects.map((p) => p.driveUrl),
    ].filter((v) => v !== null)
    for (const value of values) assert.ok(source.includes(value), `${value} is not in the source document`)
  })

  it('gives only Face Recognition and Hazardous Asteroids a Drive-materials link, and no invented ones', () => {
    assert.deepEqual(
      Object.fromEntries(portfolio.projects.map((p) => [p.id, p.driveUrl])),
      {
        'face-recognition': 'https://drive.google.com/drive/folders/1QdUDRg0ahajt_9Tomr2ttUf3i_QSxEhL?usp=drive_link',
        asteroid: 'https://drive.google.com/drive/folders/1uvXxiPpQYEyoGz2fQsUdSBc8Gr40z_0J?usp=drive_link',
        attrition: null,
        'symbio-nlm': null,
        'space-atlas': null,
        'memory-of-a-city': null,
      },
    )
  })

  it('gives only the four verified project repositories, and no invented ones', () => {
    assert.deepEqual(
      Object.fromEntries(portfolio.projects.map((p) => [p.id, p.repoUrl])),
      {
        'face-recognition': null,
        asteroid: null,
        attrition: 'https://github.com/rachana26paw/hr-attrition-ml-analysis',
        'symbio-nlm': 'https://github.com/anurag-njr11/Symbio-project',
        'space-atlas': 'https://github.com/coder-1111-coder/Space-Atlas-backend-codes',
        'memory-of-a-city': 'https://github.com/Meghna-K03/Memory-of--a-city.git',
      },
    )
  })

  it('visible copy states no rationale, causation, judgement or ordering that the source does not', () => {
    const banned = /\b(because|so that|which is why|this is why|is why|in order to|singled out|honest|trust(ed)?|around them|builds on|worked through|attacked|small neural|then one)\b/i
    for (const text of visibleCopy) assert.doesNotMatch(text, banned, `"${text}" contains rationale or judgement wording`)
  })

  it('gives Memory of a City no invented stack and the story parts no invented definitions', () => {
    const memory = portfolio.projects.find((p) => p.id === 'memory-of-a-city')
    assert.deepEqual(memory.stack, [])
    assert.ok(memory.study.story.every((part) => Object.keys(part).join() === 'label'))
  })
})
