import { X, Plus, Trash2, Edit2, Save, Command } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import RichTextEditor from './RichTextEditor';

interface Shortcut {
  id: string;
  key: string;
  text: string;
  name: string;
}

interface ShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'explore';
  shortcuts: Shortcut[];
  onCreate: (name: string, key: string, text: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, key: string, text: string) => void;
  fieldId: string;
}

export default function ShortcutModal({ 
  isOpen, 
  onClose, 
  mode, 
  shortcuts, 
  onCreate, 
  onDelete, 
  onUpdate,
  fieldId 
}: ShortcutModalProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Reset state when modal opens/closes or mode changes
  useEffect(() => {
    if (!editingId) {
      setName('');
      setKey('');
      setText('');
    }
  }, [isOpen, mode]);

  const handleCreate = () => {
    if (name && key && text) {
      onCreate(name, key, text);
      onClose();
    }
  };

  const handleUpdate = () => {
    if (editingId && name && key && text) {
      onUpdate(editingId, name, key, text);
      setEditingId(null);
      setName('');
      setKey('');
      setText('');
    }
  };

  const startEdit = (s: Shortcut) => {
    setEditingId(s.id);
    setName(s.name);
    setKey(s.key);
    setText(s.text);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Command size={20} className="text-blue-600" />
              {mode === 'create' ? 'Criar Novo Comando' : (editingId ? 'Editar Comando' : 'Explorar Comandos')}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {mode === 'create' || editingId ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-slate-500 mb-1.5">Nome do Atalho</label>
                    <input 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Prescrição Padrão"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-500 mb-1.5">Tecla (Ctrl + ...)</label>
                    <input 
                      value={key}
                      onChange={(e) => setKey(e.target.value.slice(-1))}
                      placeholder="X"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-1.5">Texto de Inserção (Formatado)</label>
                  <RichTextEditor 
                    content={text}
                    onChange={setText}
                    placeholder="O texto formatado que será inserido..."
                    className="min-h-[200px]"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  {editingId && (
                    <button 
                      onClick={() => setEditingId(null)}
                      className="px-6 py-2.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    onClick={editingId ? handleUpdate : handleCreate}
                    className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-blue-900/10"
                  >
                    {editingId ? <Save size={18} /> : <Plus size={18} />}
                    {editingId ? 'Salvar Alterações' : 'Criar Atalho'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {shortcuts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    Nenhum atalho criado para este campo.
                  </div>
                ) : (
                  shortcuts.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-blue-200 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                          {s.key.toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{s.name}</h4>
                          <div 
                            className="text-xs text-slate-500 truncate max-w-[300px]"
                            dangerouslySetInnerHTML={{ __html: s.text }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => startEdit(s)}
                          className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(s.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
