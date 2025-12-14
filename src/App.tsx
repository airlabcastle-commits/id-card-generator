import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Layout, 
  Settings, 
  Users, 
  Printer, 
  Plus, 
  Upload, 
  Trash2, 
  Download, 
  Move, 
  Type, 
  Image as ImageIcon,
  Grid,
  FileText,
  RotateCcw,
  Check
} from 'lucide-react';

// --- Types & Interfaces ---

interface CardConfig {
  width: number; // in cm
  height: number; // in cm
  dpi: number;
}

interface Field {
  id: string;
  name: string; // The data key (e.g., "Full Name")
  x: number; // mm
  y: number; // mm
  fontSize: number; // pt
  color: string;
  fontFamily: string;
  align: 'left' | 'center' | 'right';
  side: 'front' | 'back';
}

interface Person {
  id: string;
  [key: string]: string;
}

// --- Constants ---
const DEFAULT_CONFIG: CardConfig = {
  width: 14,
  height: 9.5,
  dpi: 96
};

const SAMPLE_DATA: Person[] = [
  { id: '1', 'Full Name': 'Alex Johnson', 'Role': 'Staff', 'ID Number': 'STF-001' },
  { id: '2', 'Full Name': 'Sarah Connor', 'Role': 'Speaker', 'ID Number': 'SPK-204' },
  { id: '3', 'Full Name': 'Mike Chen', 'Role': 'Attendee', 'ID Number': 'ATT-883' },
];

const COLORS = [
  '#000000', '#FFFFFF', '#1F2937', '#DC2626', '#2563EB', '#059669', '#D97706'
];

// --- Helper Functions ---

const cmToPx = (cm: number, dpi: number = 96) => (cm / 2.54) * dpi;
const mmToPx = (mm: number, dpi: number = 96) => (mm / 25.4) * dpi;
const pxToMm = (px: number, dpi: number = 96) => (px * 25.4) / dpi;

// --- Main Component ---

export default function IDCardGenerator() {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'design' | 'data' | 'print'>('design');
  const [config, setConfig] = useState<CardConfig>(DEFAULT_CONFIG);
  
  // Templates (Data URLs)
  const [templates, setTemplates] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null
  });
  
  // Fields & Data
  const [fields, setFields] = useState<Field[]>([
    { id: 'f1', name: 'Full Name', x: 70, y: 40, fontSize: 24, color: '#000000', fontFamily: 'helvetica', align: 'center', side: 'front' },
    { id: 'f2', name: 'Role', x: 70, y: 55, fontSize: 16, color: '#2563EB', fontFamily: 'helvetica', align: 'center', side: 'front' },
  ]);
  
  const [people, setPeople] = useState<Person[]>(SAMPLE_DATA);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  // --- Design Logic ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setTemplates(prev => ({ ...prev, [side]: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addField = () => {
    const newField: Field = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Field',
      x: config.width * 5, // Center roughly (cm -> mm)
      y: config.height * 5,
      fontSize: 14,
      color: '#000000',
      fontFamily: 'helvetica',
      align: 'left',
      side: activeSide
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<Field>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  // --- Data Logic ---

  const handleBulkUpload = (text: string) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return;
    
    const headers = lines[0].split(',').map(h => h.trim());
    const newPeople: Person[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const person: Person = { id: Math.random().toString(36).substr(2, 9) };
      headers.forEach((header, index) => {
        if (values[index]) person[header] = values[index];
      });
      newPeople.push(person);
    }
    
    setPeople(newPeople);
  };

  // --- PDF Generation ---

  const generatePDF = async () => {
    // Load jsPDF dynamically if not present
    if (!(window as any).jspdf) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => resolve();
        document.body.appendChild(script);
      });
    }

    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF({
      orientation: config.width > config.height ? 'l' : 'p',
      unit: 'mm',
      format: [config.width * 10, config.height * 10] // cm to mm
    });

    const widthMm = config.width * 10;
    const heightMm = config.height * 10;

    for (let i = 0; i < people.length; i++) {
      const person = people[i];
      
      // Front Side
      if (i > 0) doc.addPage([widthMm, heightMm]);
      
      if (templates.front) {
        doc.addImage(templates.front, 'JPEG', 0, 0, widthMm, heightMm);
      } else {
        // Fallback white background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, widthMm, heightMm, 'F');
      }

      // Front Fields
      fields.filter(f => f.side === 'front').forEach(f => {
        const text = person[f.name] || f.name;
        doc.setFontSize(f.fontSize);
        doc.setTextColor(f.color);
        doc.setFont(f.fontFamily, 'normal'); // Basic font support
        doc.text(text, f.x, f.y, { align: f.align });
      });

      // Back Side (only if template exists or fields exist)
      const hasBackFields = fields.some(f => f.side === 'back');
      if (templates.back || hasBackFields) {
        doc.addPage([widthMm, heightMm]);
        
        if (templates.back) {
          doc.addImage(templates.back, 'JPEG', 0, 0, widthMm, heightMm);
        } else {
           doc.setFillColor(255, 255, 255);
           doc.rect(0, 0, widthMm, heightMm, 'F');
        }

        fields.filter(f => f.side === 'back').forEach(f => {
          const text = person[f.name] || f.name;
          doc.setFontSize(f.fontSize);
          doc.setTextColor(f.color);
          doc.setFont(f.fontFamily, 'normal');
          doc.text(text, f.x, f.y, { align: f.align });
        });
      }
    }

    doc.save('event-id-cards.pdf');
  };


  // --- Render Helpers ---

  const renderContent = () => {
    switch(activeTab) {
      case 'design': return (
        <DesignTab 
          config={config} 
          setConfig={setConfig}
          templates={templates}
          onUpload={handleFileUpload}
          fields={fields}
          activeSide={activeSide}
          setActiveSide={setActiveSide}
          selectedFieldId={selectedFieldId}
          setSelectedFieldId={setSelectedFieldId}
          onUpdateField={updateField}
          onAddField={addField}
          onRemoveField={removeField}
        />
      );
      case 'data': return (
        <DataTab 
          fields={fields} 
          people={people} 
          setPeople={setPeople} 
          onBulkUpload={handleBulkUpload} 
        />
      );
      case 'print': return (
        <PrintTab 
          people={people} 
          onGenerate={generatePDF} 
          config={config}
          fields={fields}
          templates={templates}
        />
      );
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 text-slate-800 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-20 bg-slate-900 text-white flex flex-col items-center py-6 gap-6 z-20 shadow-xl">
        <div className="p-2 bg-indigo-600 rounded-lg mb-4">
          <FileText size={24} />
        </div>
        <NavButton 
          active={activeTab === 'design'} 
          onClick={() => setActiveTab('design')} 
          icon={<Settings size={20} />} 
          label="Design" 
        />
        <NavButton 
          active={activeTab === 'data'} 
          onClick={() => setActiveTab('data')} 
          icon={<Users size={20} />} 
          label="Data" 
        />
        <NavButton 
          active={activeTab === 'print'} 
          onClick={() => setActiveTab('print')} 
          icon={<Printer size={20} />} 
          label="Print" 
        />
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 z-10">
          <h1 className="text-xl font-bold text-slate-800">
            {activeTab === 'design' && 'Template Designer'}
            {activeTab === 'data' && 'Manage Attendees'}
            {activeTab === 'print' && 'Preview & Export'}
          </h1>
          <div className="text-sm text-gray-500">
            {people.length} records loaded
          </div>
        </header>
        
        <div className="flex-1 overflow-hidden relative">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// --- Sub-Components ---

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 w-full transition-all duration-200 ${active ? 'text-indigo-400 bg-slate-800 border-l-4 border-indigo-400' : 'text-slate-400 hover:text-white'}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// --- DESIGN TAB ---

function DesignTab({ 
  config, setConfig, templates, onUpload, fields, 
  activeSide, setActiveSide, selectedFieldId, setSelectedFieldId,
  onUpdateField, onAddField, onRemoveField
}: any) {
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, initX: number, initY: number } | null>(null);

  // Constants for calculating display scaling
  const DISPLAY_PADDING = 40; // px
  
  const handleMouseDown = (e: React.MouseEvent, id: string, currentX: number, currentY: number) => {
    e.stopPropagation();
    setSelectedFieldId(id);
    setDragState({
      id,
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !canvasRef.current) return;
      
      const pixelScale = canvasRef.current.clientWidth / (config.width * 10); // pixels per mm
      
      const deltaX = (e.clientX - dragState.startX) / pixelScale;
      const deltaY = (e.clientY - dragState.startY) / pixelScale;

      onUpdateField(dragState.id, {
        x: Math.round(dragState.initX + deltaX),
        y: Math.round(dragState.initY + deltaY)
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, config.width, onUpdateField]);

  const selectedField = fields.find((f: any) => f.id === selectedFieldId);

  return (
    <div className="flex h-full">
      {/* Toolbar / Settings */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto p-6 flex flex-col gap-8 shrink-0">
        
        {/* Dimensions */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase text-gray-400 tracking-wider">Card Dimensions (cm)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Width</label>
              <input 
                type="number" 
                value={config.width}
                onChange={(e) => setConfig({...config, width: parseFloat(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2 text-sm" 
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Height</label>
              <input 
                type="number" 
                value={config.height}
                onChange={(e) => setConfig({...config, height: parseFloat(e.target.value) || 0})}
                className="w-full border rounded px-3 py-2 text-sm" 
              />
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm uppercase text-gray-400 tracking-wider">Background Templates</h3>
          <div className="space-y-4">
            <div className={`border-2 border-dashed rounded-lg p-4 text-center ${activeSide === 'front' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
              <span className="block text-sm font-medium mb-2">Front Side</span>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-xs hover:bg-gray-50">
                <Upload size={14} /> Upload JPG
                <input type="file" accept=".jpg,.jpeg" className="hidden" onChange={(e) => onUpload(e, 'front')} />
              </label>
              {templates.front && <div className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1"><Check size={12}/> Loaded</div>}
            </div>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center ${activeSide === 'back' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
              <span className="block text-sm font-medium mb-2">Back Side</span>
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 rounded shadow-sm text-xs hover:bg-gray-50">
                <Upload size={14} /> Upload JPG
                <input type="file" accept=".jpg,.jpeg" className="hidden" onChange={(e) => onUpload(e, 'back')} />
              </label>
              {templates.back && <div className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1"><Check size={12}/> Loaded</div>}
            </div>
          </div>
        </div>

        {/* Field Properties */}
        {selectedField ? (
          <div className="space-y-3 border-t border-gray-200 pt-6">
             <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase text-gray-400 tracking-wider">Selected Field</h3>
                <button onClick={() => onRemoveField(selectedField.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
             </div>
             
             <div>
               <label className="text-xs text-gray-500 mb-1 block">Data Key (Must match CSV header)</label>
               <input 
                 type="text" 
                 value={selectedField.name} 
                 onChange={(e) => onUpdateField(selectedField.id, { name: e.target.value })}
                 className="w-full border rounded px-3 py-2 text-sm font-medium text-slate-700 bg-yellow-50 border-yellow-200"
               />
             </div>

             <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-xs text-gray-500 mb-1 block">Font Size (pt)</label>
                   <input type="number" value={selectedField.fontSize} onChange={(e) => onUpdateField(selectedField.id, { fontSize: parseInt(e.target.value) })} className="w-full border rounded px-3 py-2 text-sm" />
                </div>
                <div>
                   <label className="text-xs text-gray-500 mb-1 block">Alignment</label>
                   <select value={selectedField.align} onChange={(e) => onUpdateField(selectedField.id, { align: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                     <option value="left">Left</option>
                     <option value="center">Center</option>
                     <option value="right">Right</option>
                   </select>
                </div>
             </div>

             <div>
                <label className="text-xs text-gray-500 mb-1 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button 
                      key={c} 
                      onClick={() => onUpdateField(selectedField.id, { color: c })}
                      className={`w-6 h-6 rounded-full border border-gray-200 ${selectedField.color === c ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input type="color" value={selectedField.color} onChange={(e) => onUpdateField(selectedField.id, { color: e.target.value })} className="w-6 h-6 p-0 border-0 rounded-full overflow-hidden" />
                </div>
             </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded text-center text-sm text-gray-500 mt-4">
            Select a field on the card to edit its properties.
          </div>
        )}

      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-gray-200 flex flex-col items-center justify-center relative overflow-hidden p-8">
        
        {/* Canvas Controls */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-full shadow-lg p-1 flex items-center gap-1 z-10">
          <button 
            onClick={() => setActiveSide('front')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeSide === 'front' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Front
          </button>
          <button 
             onClick={() => setActiveSide('back')}
             className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeSide === 'back' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            Back
          </button>
        </div>

        <button 
          onClick={onAddField}
          className="absolute top-4 right-4 bg-white text-indigo-600 px-4 py-2 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-50 transition-colors z-10"
        >
          <Plus size={16} /> Add Text Field
        </button>

        {/* The Card Display */}
        <div 
          className="bg-white shadow-2xl relative transition-all duration-300"
          ref={canvasRef}
          style={{
            width: `min(800px, calc(100vh * ${config.width / config.height} - 200px))`,
            aspectRatio: `${config.width} / ${config.height}`,
            backgroundImage: `url(${templates[activeSide]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Empty State / Grid if no image */}
          {!templates[activeSide] && (
            <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 pointer-events-none opacity-20">
              {Array.from({ length: 144 }).map((_, i) => (
                <div key={i} className="border-r border-b border-gray-400" />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                 <span className="text-gray-400 font-medium">No Template Uploaded</span>
              </div>
            </div>
          )}

          {/* Render Fields */}
          {fields.filter((f: any) => f.side === activeSide).map((field: any) => (
            <div
              key={field.id}
              onMouseDown={(e) => handleMouseDown(e, field.id, field.x, field.y)}
              style={{
                position: 'absolute',
                left: `${(field.x / (config.width * 10)) * 100}%`,
                top: `${(field.y / (config.height * 10)) * 100}%`,
                color: field.color,
                fontSize: `${Math.max(10, field.fontSize * 0.8)}px`, // Visual approximation
                transform: 'translate(-50%, -50%)', // Center anchor
                textAlign: field.align,
                cursor: 'move',
                whiteSpace: 'nowrap'
              }}
              className={`select-none hover:bg-indigo-500/10 px-2 py-1 border-2 transition-colors ${selectedFieldId === field.id ? 'border-indigo-500 bg-indigo-500/10 z-20' : 'border-transparent border-dashed hover:border-indigo-300 z-10'}`}
            >
              {field.name}
              {selectedFieldId === field.id && (
                <div className="absolute -top-3 -right-3 w-2 h-2 bg-indigo-500 rounded-full" />
              )}
            </div>
          ))}
        </div>
        
        <div className="absolute bottom-4 text-xs text-gray-500">
          Showing: {config.width}cm x {config.height}cm
        </div>
      </div>
    </div>
  );
}

// --- DATA TAB ---

function DataTab({ fields, people, setPeople, onBulkUpload }: any) {
  const [csvText, setCsvText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [newPerson, setNewPerson] = useState<any>({});
  
  // Extract unique field names from config
  const requiredFields = Array.from(new Set(fields.map((f: any) => f.name)));

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    setPeople([...people, { ...newPerson, id: Math.random().toString(36).substr(2, 9) }]);
    setNewPerson({});
  };

  const deletePerson = (id: string) => {
    setPeople(people.filter((p: any) => p.id !== id));
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-6">
           <div>
             <h2 className="text-2xl font-bold text-slate-800">Attendee Data</h2>
             <p className="text-slate-500 mt-1">Manage the list of people to print cards for.</p>
           </div>
           <div className="flex gap-3">
             <button 
                onClick={() => setPeople([])}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
             >
                Clear All
             </button>
             <button 
               onClick={() => setShowImport(!showImport)}
               className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 transition-colors"
             >
               {showImport ? 'Hide Import' : 'Bulk Import CSV'}
             </button>
           </div>
        </div>

        {/* Bulk Import Area */}
        {showImport && (
          <div className="mb-8 bg-indigo-50 border border-indigo-100 rounded-xl p-6 animate-in slide-in-from-top-4">
            <h3 className="font-semibold text-indigo-900 mb-2">Bulk Import</h3>
            <p className="text-sm text-indigo-700 mb-4">Paste your CSV data here. The first row must contain headers that match your Field Names (e.g., "Full Name", "Role").</p>
            <textarea
              className="w-full h-32 rounded-lg border-gray-300 shadow-sm p-3 text-sm font-mono mb-3"
              placeholder={`Full Name, Role, ID Number\nJohn Doe, Staff, 001\nJane Smith, Speaker, 002`}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div className="flex justify-end">
              <button 
                onClick={() => { onBulkUpload(csvText); setShowImport(false); }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Process Data
              </button>
            </div>
          </div>
        )}

        {/* Manual Entry Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
           <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Plus size={18} /> Add Individual</h3>
           <form onSubmit={handleAddPerson} className="flex flex-wrap gap-4 items-end">
              {requiredFields.map((field: any) => (
                <div key={field} className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-medium text-gray-500 mb-1">{field}</label>
                  <input
                    required
                    type="text"
                    value={newPerson[field] || ''}
                    onChange={(e) => setNewPerson({...newPerson, [field]: e.target.value})}
                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 h-[38px]">
                Add
              </button>
           </form>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                {requiredFields.map((field: any) => (
                  <th key={field} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {field}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {people.map((person: any, idx: number) => (
                <tr key={person.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                  {requiredFields.map((field: any) => (
                    <td key={field} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {person[field] || <span className="text-gray-300 italic">Empty</span>}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => deletePerson(person.id)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr>
                  <td colSpan={requiredFields.length + 2} className="px-6 py-12 text-center text-gray-500">
                    No data added yet. Use the form above or import a CSV.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- PRINT TAB ---

function PrintTab({ people, onGenerate, config, fields, templates }: any) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    // Slight delay to allow UI to update
    setTimeout(async () => {
      await onGenerate();
      setLoading(false);
    }, 100);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
       <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Printer size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Print</h2>
          <p className="text-gray-500 mb-8">
            You are about to generate a PDF for <strong>{people.length} ID cards</strong>.<br/>
            The layout is set to <strong>{config.width}cm x {config.height}cm</strong>.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-8 text-left text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Cards:</span>
              <span className="font-medium">{people.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sides:</span>
              <span className="font-medium">{(templates.back || fields.some((f: any) => f.side === 'back')) ? 'Double Sided' : 'Single Sided'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Format:</span>
              <span className="font-medium">PDF</span>
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={loading || people.length === 0}
            className="w-full bg-indigo-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            {loading ? (
              <>Processing...</>
            ) : (
              <><Download size={24} /> Download PDF</>
            )}
          </button>
          
          {people.length === 0 && (
             <p className="text-red-500 text-xs mt-4">Please add attendee data in the Data tab first.</p>
          )}
       </div>
    </div>
  );
}