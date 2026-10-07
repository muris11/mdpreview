declare module 'markdown-it-footnote' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  interface TaskListOptions {
    enabled?: boolean
    label?: boolean
    labelAfter?: boolean
  }
  const plugin: MarkdownIt.PluginWithOptions<TaskListOptions>
  export default plugin
}

declare module 'markdown-it-texmath' {
  import type MarkdownIt from 'markdown-it'
  interface TexmathOptions {
    engine: unknown
    delimiters?: 'dollars' | 'brackets' | 'gitlab' | 'julia' | 'kramdown'
    katexOptions?: Record<string, unknown>
    useXHTML?: boolean
  }
  const plugin: MarkdownIt.PluginWithOptions<TexmathOptions>
  export default plugin
}

