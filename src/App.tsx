import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Stethoscope, Plus, LogOut, FileText, 
  ChevronRight, ChevronLeft, Save, 
  ClipboardCheck, User as UserIcon,
  Sparkles, Search, History, Activity, 
  Brain, ClipboardList, Send, X
} from 'lucide-react';
import ParticleBackground from './components/ParticleBackground';
import RichTextEditor from './components/RichTextEditor';
import ShortcutModal from './components/ShortcutModal';
import { 
  auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, 
  collection, query, where, onSnapshot, addDoc, deleteDoc, updateDoc, doc, serverTimestamp,
  type User 
} from './firebase';
import { improveText, generateHypothesesAndPlan } from './services/geminiService';

const FIELDS = [
  { id: 'qp', label: 'Queixa Principal', icon: <Activity size={20} />, placeholder: 'Qual o motivo da consulta?' },
  { id: 'hda', label: 'História da Doença Atual', icon: <History size={20} />, placeholder: 'Descreva a evolução dos sintomas...' },
  { id: 'ef', label: 'Exame Físico', icon: <Stethoscope size={20} />, placeholder: 'Registre os achados do exame físico...' },
  { id: 'hd', label: 'Hipóteses Diagnósticas', icon: <Brain size={20} />, placeholder: 'Quais as possíveis causas?' },
  { id: 'cd', label: 'Conduta', icon: <ClipboardList size={20} />, placeholder: 'Qual o plano de tratamento?' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'consultation'>('landing');
  const [formData, setFormData] = useState<Record<string, string>>({
    qp: '', hda: '', ef: '', hd: '', cd: ''
  });
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'explore'>('create');
  const [activeFieldId, setActiveFieldId] = useState<string>('qp');
  const [isImproving, setIsImproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [finalText, setFinalText] = useState('');

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // Shortcuts
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'shortcuts'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const s = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setShortcuts(s);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const startConsultation = () => setView('consultation');

  const handleFieldChange = (id: string, content: string) => {
    setFormData(prev => ({ ...prev, [id]: content }));
  };

  const handleOpenShortcutManager = (fieldId: string, mode: 'create' | 'explore') => {
    setActiveFieldId(fieldId);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleCreateShortcut = async (name: string, key: string, text: string) => {
    if (!user) return;
    await addDoc(collection(db, 'shortcuts'), {
      userId: user.uid,
      fieldId: activeFieldId,
      name,
      key,
      text
    });
  };

  const handleDeleteShortcut = async (id: string) => {
    await deleteDoc(doc(db, 'shortcuts', id));
  };

  const handleUpdateShortcut = async (id: string, name: string, key: string, text: string) => {
    await updateDoc(doc(db, 'shortcuts', id), { name, key, text });
  };

  const handleImproveHDA = async () => {
    setIsImproving(true);
    try {
      const improved = await improveText(formData.hda);
      setFormData(prev => ({ ...prev, hda: improved }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsImproving(false);
    }
  };

  const handleGenerateHypotheses = async () => {
    setIsGenerating(true);
    try {
      const { hypotheses, plan } = await generateHypothesesAndPlan(formData.hda, formData.ef);
      const formattedHypotheses = hypotheses.replace(/\n/g, '<br>');
      const formattedPlan = plan.replace(/\n/g, '<br>');
      
      setFormData(prev => ({ 
        ...prev, 
        hd: prev.hd ? prev.hd + '<br>' + formattedHypotheses : formattedHypotheses,
        cd: prev.cd ? prev.cd + '<br>' + formattedPlan : formattedPlan
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const stripHtml = (html: string) => {
    // Replace <br> and <br /> with newlines
    let processedHtml = html.replace(/<br\s*\/?>/gi, '\n');
    // Replace closing tags of block elements with newlines
    processedHtml = processedHtml.replace(/<\/p>|<\/li>|<\/div>|<\/h[1-6]>/gi, '\n');
    
    const tmp = document.createElement("DIV");
    tmp.innerHTML = processedHtml;
    
    // Get text and normalize newlines (remove triple newlines, etc)
    const text = tmp.innerText || tmp.textContent || "";
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  const generateFinalAnamnese = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const text = `\\\\ Hospital Memorial São Gabriel - Caruaru, PE
\\\\ Anamnese Clínica - ${dateStr} - ${timeStr}:

>> [QP] - Queixa Principal:
${stripHtml(formData.qp)}

>> [HDA] - História da Doença Atual:
${stripHtml(formData.hda)}

>> [EF] - Exame Físico:
${stripHtml(formData.ef)}

>> [HD] - Hipóteses Diagnósticas:
${stripHtml(formData.hd)}

>> [CD] - Conduta:
${stripHtml(formData.cd)}`;

    setFinalText(text);
    setShowFinalResult(true);
  };

  const focusNext = (currentId: string) => {
    const index = FIELDS.findIndex(f => f.id === currentId);
    if (index < FIELDS.length - 1) {
      const nextId = FIELDS[index + 1].id;
      window.dispatchEvent(new CustomEvent(`focus-editor-${nextId}`));
    }
  };

  const focusPrev = (currentId: string) => {
    const index = FIELDS.findIndex(f => f.id === currentId);
    if (index > 0) {
      const prevId = FIELDS[index - 1].id;
      window.dispatchEvent(new CustomEvent(`focus-editor-${prevId}`));
    }
  };

  if (view === 'landing') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-sans">
        <ParticleBackground />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="z-10 text-center px-4"
        >
          <div className="mb-8 inline-flex p-6 rounded-[2.5rem] bg-white border border-slate-200 shadow-xl shadow-blue-500/5">
            <Stethoscope size={64} className="text-blue-600" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 tracking-tight">
            Anamnese <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Moderna</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Otimize suas consultas com inteligência artificial e ferramentas de produtividade clínica de última geração.
          </p>

          {!user ? (
            <button 
              onClick={handleLogin}
              className="group relative flex items-center gap-3 px-10 py-5 bg-slate-900 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-slate-900/20"
            >
              <UserIcon size={20} />
              Entrar com Google
            </button>
          ) : (
            <div className="flex flex-col items-center gap-6">
              <button 
                onClick={startConsultation}
                className="group relative flex items-center gap-3 px-12 py-6 bg-blue-600 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:bg-blue-500 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                <Plus size={24} />
                Iniciar nova Consulta
              </button>
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2 text-sm font-medium">
                <LogOut size={16} /> Sair da conta
              </button>
            </div>
          )}
        </motion.div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-slate-400 text-sm font-medium tracking-widest uppercase">
          Hospital Memorial São Gabriel
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('landing')}
              className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Nova Consulta</h1>
              <p className="text-sm text-slate-500">Preencha os campos abaixo para gerar a anamnese</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-medium text-slate-900">{user?.displayName}</span>
              <span className="text-xs text-slate-500">Médico(a)</span>
            </div>
            <img src={user?.photoURL || ''} className="w-10 h-10 rounded-full border border-slate-200" alt="Avatar" />
          </div>
        </header>

        {/* Form Fields */}
        <div className="space-y-8">
          {FIELDS.map((field, index) => (
            <motion.div 
              key={field.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-3"
            >
              <div className="flex items-center gap-2 text-slate-600 font-semibold ml-1">
                <span className="text-blue-600">{field.icon}</span>
                <span>{field.label}</span>
              </div>
              <RichTextEditor 
                content={formData[field.id]}
                onChange={(content) => handleFieldChange(field.id, content)}
                placeholder={field.placeholder}
                fieldId={field.id}
                shortcuts={shortcuts.filter(s => s.fieldId === field.id)}
                onOpenShortcutManager={handleOpenShortcutManager}
                onImproveText={field.id === 'hda' ? handleImproveHDA : undefined}
                onGenerateHypotheses={field.id === 'hda' ? handleGenerateHypotheses : undefined}
                isImproving={isImproving}
                isGenerating={isGenerating}
                onNext={() => focusNext(field.id)}
                onPrev={() => focusPrev(field.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Footer Actions */}
        <footer className="mt-16 flex flex-col items-center gap-6 pb-20">
          <button 
            onClick={generateFinalAnamnese}
            className="group flex items-center gap-3 px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all duration-300 hover:scale-105 shadow-xl shadow-blue-900/30"
          >
            <FileText size={20} />
            Gerar Anamnese
          </button>
          <p className="text-slate-500 text-sm">Todos os dados são salvos automaticamente em sua conta.</p>
        </footer>
      </div>

      {/* Modals */}
      <ShortcutModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        fieldId={activeFieldId}
        shortcuts={shortcuts.filter(s => s.fieldId === activeFieldId)}
        onCreate={handleCreateShortcut}
        onDelete={handleDeleteShortcut}
        onUpdate={handleUpdateShortcut}
      />

      <AnimatePresence>
        {showFinalResult && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="text-emerald-600" />
                  Anamnese Gerada
                </h2>
                <button onClick={() => setShowFinalResult(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8">
                <pre className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-700 font-mono text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[60vh] custom-scrollbar">
                  {finalText}
                </pre>
                <div className="mt-8 flex justify-end gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(finalText);
                      alert('Copiado para a área de transferência!');
                    }}
                    className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                  >
                    Copiar Texto
                  </button>
                  <button 
                    onClick={() => setShowFinalResult(false)}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
        .prose p {
          margin-top: 0.5em;
          margin-bottom: 0.5em;
        }
      `}</style>
    </div>
  );
}
