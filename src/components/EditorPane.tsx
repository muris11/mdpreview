import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { useEffect, useMemo, useRef } from 'react'
import { languages } from '../lib/languages'
import type { Theme } from '../lib/storage'

interface EditorPaneProps {
  value: string
  theme: Theme
  wrap: boolean
  onChange: (value: string) => void
  /** Called with the current scroll ratio (0..1) whenever the editor scrolls. */
  onScrollRatio?: (ratio: number) => void
  /** Registers a callback so parents can imperatively scroll the editor. */
  scrollToRatioRef?: React.RefObject<((ratio: number) => void) | null>
}

export function EditorPane({
  value,
  theme,
  wrap,
  onChange,
  onScrollRatio,
  scrollToRatioRef,
}: EditorPaneProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  const extensions = useMemo(() => {
    const ext = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
    ] as import('@codemirror/state').Extension[]
    if (wrap) ext.push(EditorView.lineWrapping)
    return ext
  }, [wrap])

  useEffect(() => {
    const scroller = editorRef.current?.view?.scrollDOM
    if (!scroller) return

    const handleScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight
      onScrollRatio?.(max > 0 ? scroller.scrollTop / max : 0)
    }
    scroller.addEventListener('scroll', handleScroll, { passive: true })

    if (scrollToRatioRef) {
      scrollToRatioRef.current = (ratio: number) => {
        const max = scroller.scrollHeight - scroller.clientHeight
        scroller.scrollTop = max * ratio
      }
    }

    return () => scroller.removeEventListener('scroll', handleScroll)
  }, [onScrollRatio, scrollToRatioRef])

  return (
    <CodeMirror
      ref={editorRef}
      value={value}
      height="100%"
      theme={theme}
      extensions={extensions}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: false,
        autocompletion: false,
        bracketMatching: true,
        closeBrackets: true,
        highlightSelectionMatches: false,
        tabSize: 2,
      }}
      className="h-full text-[13.5px]"
    />
  )
}
