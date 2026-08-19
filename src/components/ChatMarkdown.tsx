import { Fragment } from 'react'

interface Props {
  text: string
}

export default function ChatMarkdown({ text }: Props) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Table detection: line contains | and next line is separator (|---|)
    if (line.includes('|') && i + 1 < lines.length && /^\|?[\s\-:|]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      elements.push(<MarkdownTable key={`table-${i}`} lines={tableLines} />)
      continue
    }

    // Empty line = spacing
    if (!line.trim()) {
      elements.push(<div key={`br-${i}`} className="h-2" />)
      i++
      continue
    }

    // Regular line with inline formatting
    elements.push(
      <p key={`p-${i}`} className="leading-relaxed">
        <InlineMarkdown text={line} />
      </p>,
    )
    i++
  }

  return <div className="space-y-1">{elements}</div>
}

function InlineMarkdown({ text }: { text: string }) {
  // Process bold (**text**) and italic (*text*)
  const parts: React.ReactNode[] = []
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  match = regex.exec(text)
  while (match !== null) {
    if (match.index > lastIndex) {
      parts.push(<Fragment key={lastIndex}>{text.slice(lastIndex, match.index)}</Fragment>)
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold">
          {match[2]}
        </strong>,
      )
    } else if (match[3]) {
      parts.push(
        <em key={match.index} className="italic">
          {match[3]}
        </em>,
      )
    }
    lastIndex = match.index + match[0].length
    match = regex.exec(text)
  }

  if (lastIndex < text.length) {
    parts.push(<Fragment key={lastIndex}>{text.slice(lastIndex)}</Fragment>)
  }

  return <>{parts}</>
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const parseRow = (line: string) =>
    line
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim())

  if (lines.length < 2) return null

  const headers = parseRow(lines[0])
  // skip separator line (index 1)
  const rows = lines.slice(2).map(parseRow)

  return (
    <div className="overflow-x-auto my-1">
      <table className="text-[12px] w-full border-collapse">
        <thead>
          <tr>
            {headers.map((h, j) => (
              <th
                key={j}
                className="text-left px-2 py-1 border-b border-brand-primary/15 font-semibold text-brand-primary/70"
              >
                <InlineMarkdown text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-2 py-1 border-b border-brand-primary/5 text-brand-primary/80"
                >
                  <InlineMarkdown text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
