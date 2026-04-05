import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, 
  Highlighter, Palette, Type, Sparkles, Search, 
  MoreVertical, Plus, List
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Shortcut {
  id: string;
  key: string;
  text: string;
  name: string;
}

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  fieldId?: string;
  shortcuts?: Shortcut[];
  onOpenShortcutManager?: (fieldId: string, mode: 'create' | 'explore') => void;
  onImproveText?: () => void;
  onGenerateHypotheses?: () => void;
  isImproving?: boolean;
  isGenerating?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  className?: string;
}

export default function RichTextEditor({ 
  content, 
  onChange, 
  placeholder, 
  fieldId, 
  shortcuts = [],
  onOpenShortcutManager,
  onImproveText,
  onGenerateHypotheses,
  isImproving,
  isGenerating,
  onNext,
  onPrev,
  className
}: RichTextEditorProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Digite aqui...' }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      handleKeyDown: (view, event) => {
        // Handle custom shortcuts (Ctrl + Key)
        if (event.ctrlKey && !event.shiftKey && !event.altKey && shortcuts.length > 0) {
          const shortcut = shortcuts.find(s => s.key.toLowerCase() === event.key.toLowerCase());
          if (shortcut) {
            editor?.commands.insertContent(shortcut.text);
            return true;
          }
        }

        // Handle TAB / Shift+TAB
        if (event.key === 'Tab') {
          if (onNext || onPrev) {
            event.preventDefault();
            if (event.shiftKey) {
              onPrev?.();
            } else {
              onNext?.();
            }
            return true;
          }
        }

        return false;
      },
      attributes: {
        class: cn('prose prose-slate max-w-none focus:outline-none min-h-[150px] p-4 text-slate-700 font-sans', className),
      },
    },
  });

  // Sync content if it changes externally (e.g. from Gemini)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Handle focus event from parent
  useEffect(() => {
    if (!fieldId) return;
    const handleFocus = () => {
      editor?.commands.focus();
    };
    window.addEventListener(`focus-editor-${fieldId}`, handleFocus);
    return () => window.removeEventListener(`focus-editor-${fieldId}`, handleFocus);
  }, [editor, fieldId]);

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onOpenShortcutManager) return;
    e.preventDefault();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setShowMenu(true);
  };

  useEffect(() => {
    const handleClick = () => setShowMenu(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  if (!editor) return null;

  return (
    <div 
      ref={containerRef}
      className="relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group transition-all duration-300 hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20"
      onContextMenu={handleContextMenu}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-slate-100 bg-slate-50/50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn("p-1.5 rounded hover:bg-slate-200 transition-colors", editor.isActive('bold') && "bg-blue-100 text-blue-700")}
        >
          <Bold size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn("p-1.5 rounded hover:bg-slate-200 transition-colors", editor.isActive('italic') && "bg-blue-100 text-blue-700")}
        >
          <Italic size={18} />
        </button>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={cn("p-1.5 rounded hover:bg-slate-200 transition-colors", editor.isActive({ textAlign: 'left' }) && "bg-blue-100 text-blue-700")}
        >
          <AlignLeft size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={cn("p-1.5 rounded hover:bg-slate-200 transition-colors", editor.isActive({ textAlign: 'center' }) && "bg-blue-100 text-blue-700")}
        >
          <AlignCenter size={18} />
        </button>
        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={cn("p-1.5 rounded hover:bg-slate-200 transition-colors", editor.isActive({ textAlign: 'right' }) && "bg-blue-100 text-blue-700")}
        >
          <AlignRight size={18} />
        </button>
        <div className="w-px h-6 bg-slate-200 mx-1" />
        <div className="flex items-center gap-1">
          <Highlighter size={18} className="text-slate-500" />
          <input
            type="color"
            onInput={(e) => editor.chain().focus().toggleHighlight({ color: (e.target as HTMLInputElement).value }).run()}
            className="w-6 h-6 p-0 border border-slate-300 bg-transparent cursor-pointer rounded overflow-hidden"
            title="Cor do Realce"
            defaultValue="#fbbf24"
          />
        </div>
        <div className="flex items-center gap-1 ml-1">
          <Palette size={18} className="text-slate-500" />
          <input
            type="color"
            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
            className="w-6 h-6 p-0 border border-slate-300 bg-transparent cursor-pointer rounded overflow-hidden"
            title="Cor da Fonte"
          />
        </div>
        
        {/* Gemini Options (only for HDA) */}
        {fieldId === 'hda' && (
          <div className="ml-auto flex gap-2">
            <button
              onClick={onImproveText}
              disabled={isImproving}
              className="group relative flex items-center h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all duration-500 ease-in-out overflow-hidden px-2 hover:px-4"
              title="Melhorar Texto"
            >
              <Sparkles size={16} className={cn("min-w-[16px]", isImproving ? "animate-pulse" : "")} />
              <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[120px] group-hover:ml-2 transition-all duration-500 ease-in-out text-xs font-medium">
                {isImproving ? "Melhorando..." : "Melhorar Texto"}
              </span>
            </button>
            <button
              onClick={onGenerateHypotheses}
              disabled={isGenerating}
              className="group relative flex items-center h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full transition-all duration-500 ease-in-out overflow-hidden px-2 hover:px-4"
              title="Gerar Hipóteses"
            >
              <Search size={16} className={cn("min-w-[16px]", isGenerating ? "animate-pulse" : "")} />
              <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-[120px] group-hover:ml-2 transition-all duration-500 ease-in-out text-xs font-medium">
                {isGenerating ? "Gerando..." : "Gerar Hipóteses"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Floating Bar (Context Menu) */}
      {showMenu && (
        <div 
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[180px] backdrop-blur-md"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          <button 
            onClick={() => onOpenShortcutManager(fieldId, 'create')}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors text-left"
          >
            <Plus size={14} className="text-blue-600" />
            Criar comando
          </button>
          <button 
            onClick={() => onOpenShortcutManager(fieldId, 'explore')}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 transition-colors text-left"
          >
            <List size={14} className="text-blue-600" />
            Explorar comandos
          </button>
        </div>
      )}
    </div>
  );
}
