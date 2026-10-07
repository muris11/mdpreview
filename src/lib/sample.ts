export const SAMPLE_DOCUMENT = `# Welcome to MDPreview Center ✨

A **modern** Markdown editor with *live preview*, diagrams, math and shareable
links. Start typing on the left — everything updates instantly.

> Tip: press the **Share** button to get a link that carries the whole document
> inside the URL. No account, no server required.

## Text formatting

**Bold**, *italic*, ~~strikethrough~~, \`inline code\` and
[links](https://www.markdownguide.org) all work out of the box.

## Lists & tasks

1. Ordered lists
2. Nested items
   - like this
   - and this

- [x] Task lists
- [ ] Even more checkboxes
- [ ] Ship it 🚀

## Tables

| Feature        | Status | Notes                     |
| -------------- | :----: | ------------------------- |
| Live preview   |   ✅   | Instant, debounced        |
| Mermaid        |   ✅   | Flowcharts & sequence     |
| KaTeX math     |   ✅   | Inline and block          |
| Shareable link |   ✅   | Compressed into the URL   |

## Code with syntax highlighting

\`\`\`ts
interface Preview {
  content: string
  theme: 'dark' | 'light'
}

export const render = ({ content }: Preview): string =>
  content.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
\`\`\`

\`\`\`python
def fib(n: int) -> int:
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a
\`\`\`

## Mermaid diagrams

\`\`\`mermaid
flowchart LR
  A[Write Markdown] --> B{Render}
  B -->|HTML| C[Live Preview]
  B -->|SVG| D[Diagrams]
  C --> E[Share link]
\`\`\`

## Math with KaTeX

Inline math like $E = mc^2$ works, and so do block equations:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

## Blockquotes

> "Markdown is intended to be as easy-to-read and easy-to-write as is feasible."
>
> — John Gruber

---

Made with ❤️ using React, Vite & Tailwind CSS.
`
