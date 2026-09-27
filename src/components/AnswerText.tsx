import type { ReactNode } from 'react'

type Block = { kind: 'p'; text: string } | { kind: 'ul' | 'ol'; items: string[] }

const BULLET = /^\s*[-*\u2022]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

function parse(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') })
    paragraph = []
  }
  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.replace(/^#{1,6}\s+/, '')
    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    const listMatch = bullet ?? numbered
    if (listMatch) {
      flush()
      const kind = bullet ? 'ul' : 'ol'
      const last = blocks.at(-1)
      if (last && last.kind === kind) last.items.push(listMatch[1])
      else blocks.push({ kind, items: [listMatch[1]] })
    } else if (line.trim() === '') {
      flush()
    } else {
      paragraph.push(line.trim())
    }
  }
  flush()
  return blocks
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  )
}

/** Renders the plain-text answer: paragraphs, hyphen/numbered lists and stray **bold**. No HTML is ever injected. */
export function AnswerText({ text }: { text: string }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {parse(text).map((block, i) => {
        if (block.kind === 'p') return <p key={i}>{inline(block.text)}</p>
        const Tag = block.kind
        return (
          <Tag key={i} className={`space-y-1.5 pl-5 ${block.kind === 'ul' ? 'list-disc' : 'list-decimal'}`}>
            {block.items.map((item, j) => (
              <li key={j}>{inline(item)}</li>
            ))}
          </Tag>
        )
      })}
    </div>
  )
}
