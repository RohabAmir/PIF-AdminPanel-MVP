import { useEffect, useState, type ReactNode } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Code, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Quote, Redo2, SquareCode, Strikethrough, Undo2, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/controls';
import { Modal } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { MediaPicker } from './ImageField';

function ToolBtn({ label, active, onClick, disabled, children }: { label: string; active?: boolean; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={cn('flex h-8 w-8 items-center justify-center rounded-md text-ink/70 hover:bg-accent-soft hover:text-accent disabled:opacity-40', active && 'bg-accent-soft text-accent')}
      >
        {children}
      </button>
    </Tooltip>
  );
}

function Toolbar({ editor, onImage, onLink }: { editor: Editor; onImage: () => void; onLink: () => void }) {
  const i = 'h-4 w-4';
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-field bg-body/50 px-2 py-1.5" role="toolbar" aria-label="Formatting">
      <ToolBtn label="Heading 2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className={i} /></ToolBtn>
      <ToolBtn label="Heading 3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className={i} /></ToolBtn>
      <span className="mx-1 h-5 w-px bg-accent-border" aria-hidden />
      <ToolBtn label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className={i} /></ToolBtn>
      <ToolBtn label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className={i} /></ToolBtn>
      <ToolBtn label="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough className={i} /></ToolBtn>
      <ToolBtn label="Inline code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}><Code className={i} /></ToolBtn>
      <span className="mx-1 h-5 w-px bg-accent-border" aria-hidden />
      <ToolBtn label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className={i} /></ToolBtn>
      <ToolBtn label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className={i} /></ToolBtn>
      <ToolBtn label="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className={i} /></ToolBtn>
      <ToolBtn label="Code block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}><SquareCode className={i} /></ToolBtn>
      <span className="mx-1 h-5 w-px bg-accent-border" aria-hidden />
      <ToolBtn label="Add link" active={editor.isActive('link')} onClick={onLink}><Link2 className={i} /></ToolBtn>
      <ToolBtn label="Remove link" disabled={!editor.isActive('link')} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink className={i} /></ToolBtn>
      <ToolBtn label="Insert image" onClick={onImage}><ImagePlus className={i} /></ToolBtn>
      <span className="mx-1 h-5 w-px bg-accent-border" aria-hidden />
      <ToolBtn label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className={i} /></ToolBtn>
      <ToolBtn label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className={i} /></ToolBtn>
    </div>
  );
}

/** Tiptap editor producing HTML (sanitised again on the server). */
export function RichTextEditor({ value, onChange, placeholder = 'Start writing…', disabled, label = 'Content' }: { value: string; onChange: (html: string) => void; placeholder?: string; disabled?: boolean; label?: string }) {
  const [picker, setPicker] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState('');
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !disabled,
    editorProps: { attributes: { class: 'prose-content', 'aria-label': label, role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
  });

  // Keep the editor in sync when the value is replaced externally (e.g. after loading).
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === '' && editor.isEmpty)) editor.commands.setContent(value, false);
  }, [editor, value]);
  useEffect(() => editor?.setEditable(!disabled), [editor, disabled]);

  if (!editor) return <div className="h-72 animate-pulse rounded-field border border-field bg-body" />;
  return (
    <div className="overflow-hidden rounded-field border border-field bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      {!disabled && (
        <Toolbar
          editor={editor}
          onImage={() => setPicker(true)}
          onLink={() => {
            setHref((editor.getAttributes('link').href as string | undefined) ?? 'https://');
            setLinkOpen(true);
          }}
        />
      )}
      <EditorContent editor={editor} />
      <MediaPicker
        open={picker}
        onOpenChange={setPicker}
        onPick={(src, alt) => {
          editor.chain().focus().setImage({ src, alt }).run();
          setPicker(false);
        }}
      />
      <Modal
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="Insert link"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const url = href.trim();
                if (url && /^(https?:\/\/|mailto:|tel:|\/)/.test(url)) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                else editor.chain().focus().unsetLink().run();
                setLinkOpen(false);
              }}
            >
              Apply
            </Button>
          </>
        }
      >
        <Field label="URL" hint="https://, mailto:, tel: or a site path like /contact">
          <Input value={href} onChange={(e) => setHref(e.target.value)} autoFocus />
        </Field>
      </Modal>
    </div>
  );
}
