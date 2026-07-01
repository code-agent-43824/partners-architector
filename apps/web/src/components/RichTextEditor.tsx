import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
}

/**
 * Formulation editor (spec §7.2): TipTap/ProseMirror with basic formatting.
 * Emits serialized HTML; an empty document is normalized to '' so the
 * API's "agreed requires text" guard still recognises a blank block.
 */
export function RichTextEditor({ value, onChange, ariaLabel }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
    editorProps: {
      attributes: ariaLabel
        ? { class: 'rte-content', 'aria-label': ariaLabel }
        : { class: 'rte-content' },
    },
  });

  // Sync external value changes (e.g. a version rollback) into the editor
  // without echoing them back through onUpdate.
  useEffect(() => {
    if (!editor) {
      return;
    }
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value, false);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button
          type="button"
          className={editor.isActive('bold') ? 'active' : ''}
          title="Полужирный"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleBold().run();
          }}
        >
          <b>Ж</b>
        </button>
        <button
          type="button"
          className={editor.isActive('italic') ? 'active' : ''}
          title="Курсив"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleItalic().run();
          }}
        >
          <i>К</i>
        </button>
        <button
          type="button"
          className={editor.isActive('bulletList') ? 'active' : ''}
          title="Список"
          onMouseDown={(event) => {
            event.preventDefault();
            editor.chain().focus().toggleBulletList().run();
          }}
        >
          •
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
