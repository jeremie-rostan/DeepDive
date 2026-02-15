import React, { useState } from 'react';
import { 
  BrainCircuit, 
  Plus, 
  Sparkles, 
  FileText, 
  RefreshCw, 
  Lightbulb, 
  CheckSquare, 
  Download, 
  X,
  ChevronRight,
  Users,
  Settings,
  CheckCircle2,
  Info
} from 'lucide-react';

import { PERSONAS, INITIAL_STATE, INITIAL_TREE_NODE } from './constants';
import { TreeNode } from './components/TreeNode';
import { ActionItem } from './components/ActionItem';
import { ExpandableTextArea } from './components/ExpandableTextArea';
import { callGemini } from './services/geminiService';
import { AppState, TreeNodeData, PathItem, Action } from './types';

// -- Helper Logic for Tree Operations --

const updateNodeInTree = (nodes: TreeNodeData[], targetId: string, updates: Partial<TreeNodeData>): TreeNodeData[] => {
  return nodes.map(node => {
    if (node.id === targetId) {
      return { ...node, ...updates };
    }
    if (node.children.length > 0) {
      return { ...node, children: updateNodeInTree(node.children, targetId, updates) };
    }
    return node;
  });
};

const addNodeToTree = (nodes: TreeNodeData[], parentId: string, relation: 'child' | 'sibling'): [boolean, TreeNodeData[]] => {
  let modified = false;
  const traverse = (currentNodes: TreeNodeData[]): TreeNodeData[] => {
    return currentNodes.map(node => {
      if (modified) return node;

      // Add Child Logic
      if (relation === 'child' && node.id === parentId) {
        modified = true;
        return { ...node, children: [...node.children, INITIAL_TREE_NODE('why')] };
      }

      // Add Sibling Logic
      if (relation === 'sibling') {
         const siblingIndex = node.children.findIndex(c => c.id === parentId);
         if (siblingIndex !== -1) {
           modified = true;
           const newChildren = [...node.children];
           newChildren.splice(siblingIndex + 1, 0, INITIAL_TREE_NODE('why'));
           return { ...node, children: newChildren };
         }
      }

      // Recurse
      if (node.children.length > 0) {
         const updatedChildren = traverse(node.children);
         if (modified) { 
           return { ...node, children: updatedChildren };
         }
      }
      return node;
    });
  };

  const newNodes = traverse(nodes);
  return [modified, newNodes];
};

const deleteNodeFromTree = (nodes: TreeNodeData[], targetId: string): TreeNodeData[] => {
  return nodes.filter(node => node.id !== targetId).map(node => ({
    ...node,
    children: deleteNodeFromTree(node.children, targetId)
  }));
};

// -- AI Context Helpers --

const formatTreeForAI = (nodes: TreeNodeData[], level = 0): string => {
  return nodes.map(node => {
    const indent = "  ".repeat(level);
    let output = `${indent}- [${node.type.toUpperCase()}] ${node.text || "(Empty)"}`;
    
    if (node.type === 'problem' && node.title) output += ` (Title: ${node.title})`;
    
    if (node.rootCause) {
      output += `\n${indent}  -> IDENTIFIED ROOT CAUSE: ${node.rootCause}`;
    }
    
    if (node.solutionsText) {
      output += `\n${indent}  -> PROPOSED SOLUTIONS: ${node.solutionsText}`;
    }
    
    if (node.actions && node.actions.length > 0) {
      output += `\n${indent}  -> ACTIONS: ${JSON.stringify(node.actions)}`;
    }
    
    if (node.children.length > 0) {
      output += "\n" + formatTreeForAI(node.children, level + 1);
    }
    
    return output;
  }).join("\n");
};


export default function FiveWhysApp() {
  const [data, setData] = useState<AppState>(INITIAL_STATE);
  
  // Team Configuration State
  const [teamConfig, setTeamConfig] = useState<Record<string, { enabled: boolean; assignee: string }>>(() => {
    const config: Record<string, { enabled: boolean; assignee: string }> = {};
    Object.keys(PERSONAS).forEach(key => {
      config[key] = { enabled: true, assignee: '' };
    });
    return config;
  });
  const [showTeamConfig, setShowTeamConfig] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // -- Event Handlers --

  const handleUpdateNode = (id: string, updates: Partial<TreeNodeData>) => {
    setData(prev => ({
      ...prev,
      problemTrees: updateNodeInTree(prev.problemTrees, id, updates)
    }));
  };

  const handleAddChild = (targetId: string, relation: 'child' | 'sibling') => {
    // Special case: Adding a sibling to a root problem (Top Level Column) OR explicitly asking for a new root ('root')
    if (relation === 'sibling') {
       // Check if target is 'root' (explicit "New Problem" button) or if the ID belongs to a top-level problem
       const isRoot = targetId === 'root' || data.problemTrees.some(p => p.id === targetId);
       
       if (isRoot) {
         setData(prev => ({
           ...prev,
           problemTrees: [
             ...prev.problemTrees, 
             { 
               ...INITIAL_TREE_NODE('problem'), 
               title: `Problem ${prev.problemTrees.length + 1}`,
               children: [INITIAL_TREE_NODE('why')] // Initialize with one Why node for better UX
             }
           ]
         }));
         return;
       }
    }

    setData(prev => {
      const [, newTrees] = addNodeToTree(prev.problemTrees, targetId, relation);
      return { ...prev, problemTrees: newTrees };
    });
  };

  const handleDeleteNode = (id: string) => {
    if (data.problemTrees.length === 1 && data.problemTrees[0].id === id) return; // Don't delete last root
    setData(prev => ({
      ...prev,
      problemTrees: deleteNodeFromTree(prev.problemTrees, id)
    }));
  };

  const handleUltimateActionUpdate = (index: number, field: keyof Action, value: string) => {
    const newActions = [...data.ultimateActions];
    newActions[index] = { ...newActions[index], [field]: value };
    setData(prev => ({ ...prev, ultimateActions: newActions }));
  };

  const addUltimateAction = () => {
    setData(prev => ({
       ...prev, 
       ultimateActions: [...prev.ultimateActions, { description: "", assignee: "", deadline: "" }]
    }));
  };

  const handleAiAssist = async (type: string, path: PathItem[] = [], nodeId: string | null = null) => {
    setIsGenerating(true);
    
    // Construct context
    const pathText = path.map(p => `${p.type === 'problem' ? 'Problem' : 'Why'}: ${p.text || '(Empty)'}`).join(' -> ');
    const fullTreeContext = formatTreeForAI(data.problemTrees);
    
    const currentNode = nodeId ? (function findNode(nodes: TreeNodeData[]): TreeNodeData | undefined {
        for (const node of nodes) {
            if (node.id === nodeId) return node;
            const found = findNode(node.children);
            if (found) return found;
        }
    })(data.problemTrees) : undefined;

    let prompt = "";
    
    // --- BUILD AI CONTEXT ---
    // The user requested roles be irrelevant to AI. 
    // We only use the context description and the tree content.
    const globalContext = data.contextDescription 
      ? `Analysis Purpose & Context: "${data.contextDescription}".` 
      : "";

    const systemContext = `You are an expert root cause analysis assistant. 
    ${globalContext}
    
    Instructions:
    - Provide objective, concise, and practical analysis based strictly on the text inputs provided.
    - Do not assume any specific persona unless explicitly asked in the user text.
    - Focus on logical consistency and evidence-based reasoning.`;

    switch (type) {
      case 'problem_refine':
         prompt = `Analyze this problem statement: "${currentNode?.text}". Improve it to be more specific, measurable, and objective.`;
         const refined = await callGemini(prompt, systemContext);
         if (nodeId) handleUpdateNode(nodeId, { text: refined });
         break;

      case 'why':
        prompt = `Based on the analysis path: "${pathText}", suggest a logical next 'Why' or cause for the last item. Keep it short.`;
        const suggestion = await callGemini(prompt, systemContext);
        if (nodeId) handleUpdateNode(nodeId, { text: suggestion });
        break;

      case 'rootCause':
        prompt = `Analyze this branch: "${pathText}". Identify the specific Root Cause for this specific chain of events.`;
        const root = await callGemini(prompt, systemContext);
        if (nodeId) handleUpdateNode(nodeId, { rootCause: root });
        break;
      
      case 'solution':
         prompt = `Given the analysis chain "${pathText}", suggest a practical solution.`;
         const sol = await callGemini(prompt, systemContext);
         if (nodeId && currentNode) {
             handleUpdateNode(nodeId, { solutionsText: (currentNode.solutionsText || "") + "\n• " + sol });
         }
         break;

      case 'ultimateCause':
        prompt = `
          Analyze the entire 5-Why Analysis Tree below. 
          Look at all branches, from the initial Problem statements down to the various 'Why' levels and identified Root Causes.
          
          FULL ANALYSIS TREE:
          ${fullTreeContext}
          
          Task:
          Synthesize all these findings into a single "Ultimate Cause". 
          This should be the deep systemic issue that connects the different branches or explains the primary failure mode.
          Be comprehensive but concise.
        `;
        const ult = await callGemini(prompt, systemContext);
        setData(prev => ({ ...prev, ultimateCause: ult }));
        break;

      case 'ultimateSolutions':
        const problemStatements = data.problemTrees.map(p => `"${p.text}"`).join(', ');
        prompt = `
          Context:
          Original Problems: ${problemStatements}
          Identified Ultimate Root Cause: "${data.ultimateCause}"
          
          Task:
          Suggest 2-3 strategic, high-level solutions that address the Ultimate Root Cause and would effectively resolve the Original Problems.
        `;
        const ultSol = await callGemini(prompt, systemContext);
        setData(prev => ({ 
          ...prev, 
          ultimateSolutionsText: (prev.ultimateSolutionsText ? prev.ultimateSolutionsText + "\n" : "") + ultSol 
        }));
        break;

      case 'ultimateActions':
        prompt = `
          Given the Ultimate Cause: "${data.ultimateCause}" and Strategic Solutions: "${data.ultimateSolutionsText}",
          Suggest 3 concrete executive actions.
          Return ONLY a valid JSON array of objects. Do not wrap in markdown or code blocks.
          Format: [{"description": "Action details", "assignee": "Role", "deadline": "Duration/Date"}]
        `;
        const actionsJsonStr = await callGemini(prompt, systemContext);
        try {
          const cleanJson = actionsJsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
          const newActions = JSON.parse(cleanJson);
          if (Array.isArray(newActions)) {
             setData(prev => ({
               ...prev,
               ultimateActions: [...prev.ultimateActions, ...newActions]
             }));
          } else {
             throw new Error("Not an array");
          }
        } catch (e) {
          setData(prev => ({
            ...prev,
            ultimateActions: [...prev.ultimateActions, { description: "Review AI suggestion: " + actionsJsonStr, assignee: "", deadline: "" }]
          }));
        }
        break;

      case 'report':
         prompt = `
         Generate a formal "5 Why Analysis Report" as semantic HTML.
         
         You must strictly distinguish between the "Brainstorming/Analysis Data" (which is the input provided by users/AI previously) and the "Report Synthesis" (your formatted output).
         
         --- INPUT DATA START ---
         CONTEXT/PURPOSE: ${data.contextDescription}
         
         FULL ANALYSIS TREE (Brainstorming Data):
         ${fullTreeContext}
         
         CONSOLIDATED ULTIMATE CAUSE: ${data.ultimateCause}
         STRATEGIC SOLUTIONS: ${data.ultimateSolutionsText}
         EXECUTIVE ACTIONS: ${JSON.stringify(data.ultimateActions)}
         --- INPUT DATA END ---
         
         Requirements:
         1. Use standard HTML tags (<h3>, <p>, <ul>, <li>, <strong>, <table>, <hr>).
         2. Do NOT use markdown syntax.
         3. Structure the report clearly:
            - **Executive Summary**: Briefly summarize the findings, referencing the Context/Purpose.
            - **Detailed Analysis Breakdown**: Present the 'Analysis Tree' data in a readable format.
            - **Systemic Root Cause**: The consolidated ultimate cause.
            - **Strategic Plan**: The solutions and actions.
         `;
         const report = await callGemini(prompt, systemContext);
         setGeneratedReport(report);
         setShowReportModal(true);
         break;
    }
    setIsGenerating(false);
  };

  const togglePersona = (id: string) => {
    setTeamConfig(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled: !prev[id].enabled }
    }));
  };

  const updateAssignee = (id: string, name: string) => {
    setTeamConfig(prev => ({
      ...prev,
      [id]: { ...prev[id], assignee: name }
    }));
  };

  const enabledPersonas = Object.values(PERSONAS).filter(p => teamConfig[p.id]?.enabled);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-20">
      
      {/* --- Header --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-full mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            
            {/* Logo Area */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-lg shadow-md text-white">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-lg font-bold text-slate-800 leading-tight">DeepDive</h1>
                 <input 
                  value={data.title}
                  onChange={(e) => setData({...data, title: e.target.value})}
                  className="text-xs text-slate-500 bg-transparent outline-none hover:text-blue-600 focus:text-blue-600 transition-colors w-40"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setShowTeamConfig(true)}
                 className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200"
                 title="Configure Team"
               >
                 <Users className="w-4 h-4" />
                 <span className="text-xs font-semibold hidden sm:inline">Team Setup</span>
               </button>

               <div className="h-6 w-px bg-slate-200 mx-1"></div>

               <button 
                onClick={() => handleAiAssist('report')}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-sm font-semibold text-xs border ${
                  isGenerating 
                    ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                    : 'bg-slate-900 text-white border-transparent hover:bg-slate-800 hover:shadow-md'
                }`}
              >
                {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <FileText className="w-3.5 h-3.5" />}
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- Team Deck Bar --- */}
      <div className="bg-white border-b border-slate-200 shadow-sm relative z-20">
          <div className="max-w-[98vw] mx-auto px-4 py-3">
             <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x items-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-shrink-0 mr-2 flex flex-col gap-0.5">
                  <span>Active</span>
                  <span>Team</span>
                </div>
                {enabledPersonas.length === 0 ? (
                   <button 
                      className="text-sm text-slate-500 flex items-center gap-2 px-4 py-2 border border-dashed border-slate-300 rounded-xl hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all" 
                      onClick={() => setShowTeamConfig(true)}
                   >
                      <Plus className="w-4 h-4"/> Add Thinking Hats
                   </button>
                ) : (
                   enabledPersonas.map(persona => {
                      const config = teamConfig[persona.id];
                      return (
                        <div
                           key={persona.id}
                           className="group relative flex items-center gap-3 p-2 pr-4 rounded-xl border bg-white border-slate-200 shadow-sm min-w-[200px] snap-start"
                        >
                           {/* Avatar */}
                           <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
                              <img src={persona.imageUrl} alt={persona.name} className="w-full h-full object-cover" />
                           </div>
                           
                           {/* Info */}
                           <div className="flex flex-col min-w-0">
                              <span className={`text-xs font-bold leading-tight truncate text-slate-800`}>
                                 {persona.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium truncate w-full">
                                 {config.assignee ? config.assignee : "AI Assistant"}
                              </span>
                           </div>
                           
                           {/* Context Indicator Dot */}
                           <div className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ${persona.textColor.replace('text-', 'bg-')}`}></div>
                        </div>
                      );
                   })
                )}
                
                {/* Add/Edit Button at end of list for quick access */}
                 <button 
                   onClick={() => setShowTeamConfig(true)}
                   className="flex-shrink-0 w-8 h-8 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all"
                   title="Edit Team"
                 >
                    <Settings className="w-4 h-4" />
                 </button>
             </div>
          </div>
       </div>

      <main className="max-w-[98vw] mx-auto px-4 py-8">

        {/* --- Context Description Field --- */}
        <div className="max-w-4xl mx-auto mb-10 px-4 sm:px-0">
           <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 ring-1 ring-slate-100 flex gap-4">
              <div className="pt-1">
                 <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                    <Info className="w-5 h-5" />
                 </div>
              </div>
              <div className="flex-1">
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Analysis Context & Purpose</label>
                 <textarea 
                    className="w-full text-slate-700 bg-transparent outline-none resize-none text-sm placeholder-slate-300"
                    rows={2}
                    placeholder="E.g. Investigating the sudden drop in user retention on the mobile app checkout flow..."
                    value={data.contextDescription}
                    onChange={(e) => setData(prev => ({ ...prev, contextDescription: e.target.value }))}
                 />
              </div>
           </div>
        </div>
        
        {/* --- Main Tree View --- */}
        <div className="overflow-x-auto pb-16 min-h-[600px] scroll-smooth">
          <div className="flex gap-12 min-w-max px-8 pt-4">
            {data.problemTrees.map((rootNode) => (
              <TreeNode 
                key={rootNode.id}
                node={rootNode}
                onUpdate={handleUpdateNode}
                onDelete={handleDeleteNode}
                onAddChild={handleAddChild}
                onAiRequest={handleAiAssist}
                level={0}
              />
            ))}

            {/* Add New Problem Column Button */}
            <div className="flex flex-col items-center pt-2">
              <button 
                onClick={() => handleAddChild('root', 'sibling')} 
                className="group flex flex-col items-center justify-center w-24 h-full gap-3 opacity-60 hover:opacity-100 transition-all"
              >
                 <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center bg-white group-hover:border-blue-400 group-hover:bg-blue-50 group-hover:text-blue-500 text-slate-300 transition-all shadow-sm">
                   <Plus className="w-8 h-8" />
                 </div>
                 <span className="text-xs font-bold text-slate-400 group-hover:text-blue-500 uppercase tracking-wide">New Problem</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- Ultimate Cause Section (Consolidated Design) --- */}
        <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-1 shadow-xl max-w-6xl mx-auto ring-1 ring-slate-100">
           <div className="bg-white rounded-[1.4rem] p-8 md:p-10">
             
             {/* Header */}
             <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8 border-b border-slate-100 pb-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-blue-50">
                    <BrainCircuit className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ultimate Root Cause</h2>
                    <p className="text-slate-500 text-sm">Synthesize the systemic origin across all analysis branches.</p>
                  </div>
               </div>
               <div className="md:ml-auto">
                 <button 
                  onClick={() => handleAiAssist('ultimateCause')}
                  disabled={isGenerating}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all hover:scale-105 shadow-md active:scale-95"
                 >
                   {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4 text-blue-300" />}
                   Analyze Ultimate Cause
                 </button>
               </div>
             </div>

             {/* Main Text Area - Styled to look like a "Problem" or "Conclusion" block */}
             <div className="bg-blue-50/50 rounded-2xl border border-blue-100 p-2 mb-10">
               <ExpandableTextArea
                value={data.ultimateCause}
                onChange={(e) => setData(prev => ({ ...prev, ultimateCause: e.target.value }))}
                placeholder="Synthesize the ultimate cause here..."
                baseClassName="text-xl md:text-2xl font-normal text-slate-800 placeholder-slate-400 bg-transparent border-none p-4 leading-relaxed"
                collapsedHeightClass="h-28"
                onAiRequest={undefined}
               />
             </div>
             
             {/* Two Column Layout for Solutions and Actions */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               
               {/* Solutions Column - Styled like "Solutions" leaf node */}
               <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-sm ring-1 ring-emerald-50/50">
                  <div className="flex items-center gap-2 mb-4">
                     <div className="p-1.5 bg-emerald-100 rounded-lg">
                       <Lightbulb className="w-4 h-4 text-emerald-600" />
                     </div>
                     <h3 className="text-lg font-bold text-emerald-800">Strategic Solutions</h3>
                  </div>
                  <ExpandableTextArea
                    value={data.ultimateSolutionsText || ""}
                    onChange={(e) => setData(prev => ({...prev, ultimateSolutionsText: e.target.value}))}
                    baseClassName="text-base text-slate-600 bg-transparent border-none p-0"
                    collapsedHeightClass="h-40"
                    placeholder="Describe high-level strategic solutions..."
                    onAiRequest={() => handleAiAssist('ultimateSolutions')}
                    aiIcon={Sparkles}
                  />
               </div>

               {/* Actions Column - Styled like "Actions" leaf node */}
               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                       <div className="p-1.5 bg-slate-200 rounded-lg">
                         <CheckSquare className="w-4 h-4 text-slate-600" />
                       </div>
                       <h3 className="text-lg font-bold text-slate-700">Executive Actions</h3>
                     </div>
                     <button 
                      onClick={() => handleAiAssist('ultimateActions')}
                      className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 bg-white text-blue-600 px-2 py-1 rounded border border-slate-200 hover:border-blue-300 transition-colors shadow-sm"
                    >
                       <Sparkles className="w-3 h-3" /> Suggest
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {data.ultimateActions.map((action, i) => (
                       <ActionItem 
                        key={i} 
                        action={action} 
                        index={i} 
                        updateAction={handleUltimateActionUpdate} 
                        removeAction={(idx) => {
                           const newActions = data.ultimateActions.filter((_, k) => k !== idx);
                           setData(p => ({...p, ultimateActions: newActions}));
                        }}
                       />
                    ))}
                  </div>
                  <button 
                    onClick={addUltimateAction}
                    className="w-full py-3 mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 border border-dashed border-slate-300 rounded-xl hover:bg-white hover:text-blue-600 transition-all hover:border-blue-300 hover:shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> ADD ACTION ITEM
                  </button>
               </div>
             </div>
           </div>
        </div>

      </main>

      {/* --- Team Config Modal --- */}
      {showTeamConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col ring-1 ring-slate-900/10 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg shadow-sm border border-slate-100">
                       <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                       <h2 className="text-lg font-bold text-slate-800">Team Configuration</h2>
                       <p className="text-xs text-slate-500">Select thinking hats and assign team members</p>
                    </div>
                 </div>
                 <button onClick={() => setShowTeamConfig(false)} className="p-2 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                 </button>
              </div>
              
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                 {Object.values(PERSONAS).map((persona) => {
                    const config = teamConfig[persona.id];
                    const Icon = persona.icon;
                    return (
                       <div key={persona.id} className={`p-4 rounded-xl border transition-all ${config.enabled ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100' : 'bg-slate-50 border-slate-200 opacity-70'}`}>
                          <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${persona.lightColor}`}>
                                   <Icon className={`w-4 h-4 ${persona.textColor}`} />
                                </div>
                                <span className={`font-bold text-sm ${persona.textColor}`}>{persona.name}</span>
                             </div>
                             <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out rounded-full cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  id={`toggle-${persona.id}`}
                                  className="peer absolute w-full h-full opacity-0 z-10 cursor-pointer"
                                  checked={config.enabled}
                                  onChange={() => togglePersona(persona.id)}
                                />
                                <div className="block w-full h-full bg-gray-200 rounded-full peer-checked:bg-blue-500 transition-colors"></div>
                                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5"></div>
                             </div>
                          </div>
                          <div className="space-y-2">
                             <p className="text-[10px] text-slate-500 leading-tight h-8 overflow-hidden">{persona.description}</p>
                             <div className="relative">
                                <Users className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                                <input 
                                  type="text" 
                                  disabled={!config.enabled}
                                  placeholder={config.enabled ? "Enter assignee name..." : "Disabled"}
                                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400 transition-all"
                                  value={config.assignee}
                                  onChange={(e) => updateAssignee(persona.id, e.target.value)}
                                />
                             </div>
                          </div>
                       </div>
                    );
                 })}
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                 <button 
                    onClick={() => setShowTeamConfig(false)} 
                    className="px-6 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
                 >
                    Done
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* --- Report Modal --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/10">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-lg">
                   <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                   <h2 className="text-xl font-bold text-slate-800">Final Analysis Report</h2>
                   <p className="text-xs text-slate-500">Generated by DeepDive AI</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-10 font-sans text-slate-800 leading-relaxed bg-white">
              {generatedReport ? (
                <div 
                  className="prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-lg prose-h3:text-blue-700 prose-p:text-slate-600 prose-li:text-slate-600"
                  dangerouslySetInnerHTML={{ __html: generatedReport }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                  <p className="font-medium animate-pulse">Generating comprehensive report...</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => setShowReportModal(false)}
                className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-200 rounded-xl transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  const tempDiv = document.createElement('div');
                  tempDiv.innerHTML = generatedReport || '';
                  navigator.clipboard.writeText(tempDiv.innerText);
                  alert('Report text copied to clipboard! You can paste this into a Google Doc.');
                }}
                className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 font-semibold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                 <FileText className="w-4 h-4" /> Copy Text
              </button>
              <button 
                onClick={() => {
                   if (!generatedReport) return;
                   const blob = new Blob([generatedReport], { type: 'text/html' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `DeepDive_Report_${new Date().toISOString().split('T')[0]}.html`;
                   document.body.appendChild(a);
                   a.click();
                   document.body.removeChild(a);
                   URL.revokeObjectURL(url);
                }}
                className="px-5 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-all hover:shadow-lg flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}