import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror'
import { useEffect, useMemo, useRef } from 'react'
import { isImageFile, pasteImageFiles, type ImageTarget } from '../lib/images'
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
  /** Reports the result of an image paste (Ctrl/Cmd + V) to the user. */
  onNotify?: (text: string, tone?: 'success' | 'info') => void
}

const noop = () => {}

/**
 * Bridges the image uploader and the editor: inserts at the cursor, and swaps
 * the temporary placeholder for the final markdown once the upload resolves.
 * Every dispatch is guarded because the pane can be unmounted (view switch)
 * while an image is still being processed.
 */
function bridge(view: EditorView): ImageTarget {
  const dispatch = (spec: import('@codemirror/state').TransactionSpec) => {
    try {
      view.dispatch(spec)
    } catch {
      /* editor unmounted in the meantime — nothing to insert into */
    }
  }

  return {
    insert: (text) => {
      const at = view.state.selection.main.head
      dispatch({
        changes: { from: at, to: at, insert: text },
        selection: { anchor: at + text.length },
        userEvent: 'input',
      })
    },
    replace: (placeholder, text) => {
      const index = view.state.doc.toString().indexOf(placeholder)
      // The user already deleted the placeholder — nothing left to swap.
      if (index < 0) return
      dispatch({
        changes: { from: index, to: index + placeholder.length, insert: text },
        userEvent: 'input',
      })
    },
  }
}

export function EditorPane({
  value,
  theme,
  wrap,
  onChange,
  onScrollRatio,
  scrollToRatioRef,
  onNotify,
}: EditorPaneProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  // `onNotify` comes from useToasts, which is stable — extensions are only
  // rebuilt if the caller hands us a different callback.
  const extensions = useMemo(() => {
    const ext = [
      markdown({ base: markdownLanguage, codeLanguages: languages }),
    ] as import('@codemirror/state').Extension[]
    if (wrap) ext.push(EditorView.lineWrapping)
    ext.push(
      EditorView.domEventHandlers({
        paste(event, view) {
          const files = Array.from(event.clipboardData?.files ?? []).filter(
            isImageFile,
          )
          if (!files.length) return false
          event.preventDefault()
          void pasteImageFiles(files, bridge(view), onNotify ?? noop).catch(
            () => onNotify?.("Couldn't add that image", 'info'),
          )
          view.focus()
          return true
        },
      }),
    )
    return ext
  }, [wrap, onNotify])

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
