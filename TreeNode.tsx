import React from 'react';
import { 
  Trash2, 
  Sparkles, 
  Bot, 
  Search, 
  Lightbulb, 
  CheckSquare, 
  CornerDownRight, 
  ArrowDown, 
  GitBranch 
} from 'lucide-react';
import { TreeNodeData, Action, PathItem } from '../types';
import { ExpandableTextArea } from './ExpandableTextArea';
import { ActionItem } from './ActionItem';

interface TreeNodeProps {
  node: TreeNodeData;
  path?: PathItem[];
  onUpdate: (id: string, updates: Partial<TreeNodeData>) => void;
  onDelete?: (id: string) => void;
  onAddChild: (id: string, relation: 'child' | 'sibling') => void;
  onAiRequest: (type: string, path: PathItem[], nodeId: string) => void;
  level?: number;
}

export const TreeNode: React.FC<TreeNodeProps> = ({ 
  node, 
  path = [], 
  onUpdate, 
  onDelete, 
  onAddChild, 
  onAiRequest, 
  level = 0 
}) => {
  const isLeaf = node.children.length === 0;
  const currentPath = [...path, { text: node.text, type: node.type }];

  const updateField = (field: keyof TreeNodeData, value: any) => {
    onUpdate(node.id, { [field]: value });
  };

  const updateAction = (idx: number, field: keyof Action, val: string) => {
    const newActions = [...node.actions];
    newActions[idx] = { ...newActions[idx], [field]: val };
    updateField('actions', newActions);
  };

  const removeAction = (idx: number) => {
    const newActions = node.actions.filter((_, i) => i !== idx);
    updateField('actions', newActions);
  };

  const addAction = () => {
    const newActions = [...(node.actions || []), { description: "", assignee: "", deadline: "" }];
    updateField('actions', newActions);
  };

  // Determine styles based on node type
  const isProblem = node.type === 'problem';
  const cardStyle = isProblem 
    ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-100' 
    : 'bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300';
  
  const headerTextStyle = isProblem
    ? 'text-blue-700 font-bold'
    : 'text-slate-400 font-semibold';

  return (
    <div className="flex flex-col items-center">
      {/* Connector Line (Vertical from parent) */}
      {level > 0 && (
        <div className="h-8 w-px bg-slate-300"></div>
      )}

      {/* Node Card Container */}
      <div className={`relative group w-80 flex-shrink-0 flex flex-col gap-2 ${isProblem ? 'mb-2' : ''}`}>
        
        {/* Main Content Card */}
        <div className={`p-4 rounded-2xl border transition-all duration-200 ${cardStyle}`}>
          
          {/* Header/Tools */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2 flex-1">
              {isProblem ? (
                <input
                  className="text-xs font-bold text-blue-600 uppercase tracking-wider bg-transparent outline-none w-full placeholder-blue-300"
                  value={node.title || ''}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="PROBLEM TITLE"
                />
              ) : (
                <span className={`text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${headerTextStyle}`}>
                  <div className="bg-slate-100 p-1 rounded-md">
                    <CornerDownRight className="w-3 h-3" />
                  </div>
                  Why #{level}
                </span>
              )}
            </div>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               {onDelete && (
                 <button onClick={() => onDelete(node.id)} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                   <Trash2 className="w-3.5 h-3.5" />
                 </button>
               )}
            </div>
          </div>

          {/* Text Area */}
          <ExpandableTextArea 
            value={node.text}
            onChange={(e) => updateField('text', e.target.value)}
            placeholder={isProblem ? "Describe the problem clearly..." : "Why did this happen?"}
            baseClassName={isProblem ? 'font-medium text-slate-800 text-base' : 'text-slate-600'}
            collapsedHeightClass={isProblem ? 'h-20' : 'h-16'}
            onAiRequest={() => onAiRequest(isProblem ? 'problem_refine' : 'why', currentPath, node.id)}
            aiIcon={Bot}
          />
        </div>

        {/* Node Controls (Add Child/Branch) - Floating pills on hover */}
        <div className="flex justify-center gap-3 -mt-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
           <button 
             onClick={() => onAddChild(node.id, 'child')}
             className="bg-slate-800 text-white pl-2 pr-3 py-1.5 rounded-full shadow-lg hover:bg-blue-600 hover:scale-105 transition-all flex items-center gap-1.5 text-[11px] font-semibold ring-2 ring-white"
           >
             <ArrowDown className="w-3.5 h-3.5" /> Deepen
           </button>
           <button 
             onClick={() => onAddChild(node.id, 'sibling')}
             className="bg-white text-slate-700 border border-slate-200 pl-2 pr-3 py-1.5 rounded-full shadow-lg hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 hover:scale-105 transition-all flex items-center gap-1.5 text-[11px] font-semibold"
           >
             <GitBranch className="w-3.5 h-3.5" /> Branch
           </button>
        </div>

        {/* Leaf Node: Root Cause Section */}
        {isLeaf && (
          <div className="mt-4 pt-4 px-2">
            <div className="relative">
               {/* Vertical line connecting to root cause box */}
               <div className="absolute -top-4 left-1/2 -translate-x-1/2 h-4 w-px bg-slate-300 border-l border-dashed border-slate-300"></div>
               
               <div className="flex flex-col gap-3">
                {/* Root Cause Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-3 rounded-xl border border-blue-100 shadow-sm group-root">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <div className="bg-blue-100 p-1 rounded-md text-blue-600"><Search className="w-3 h-3"/></div>
                      ROOT CAUSE
                    </h5>
                  </div>
                  <ExpandableTextArea 
                    value={node.rootCause || ""}
                    onChange={(e) => updateField('rootCause', e.target.value)}
                    placeholder="Identify root cause..."
                    baseClassName="text-sm text-slate-700"
                    collapsedHeightClass="h-20"
                    onAiRequest={() => onAiRequest('rootCause', currentPath, node.id)}
                    aiIcon={Sparkles}
                  />
                </div>

                {/* Solutions Card */}
                <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm ring-1 ring-emerald-50">
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                       <div className="bg-emerald-100 p-1 rounded-md text-emerald-600"><Lightbulb className="w-3 h-3"/></div>
                       SOLUTIONS
                    </h5>
                  </div>
                  <ExpandableTextArea 
                    value={node.solutionsText || ""}
                    onChange={(e) => updateField('solutionsText', e.target.value)}
                    placeholder="Proposed solutions..."
                    baseClassName="text-sm text-slate-700"
                    collapsedHeightClass="h-20"
                    onAiRequest={() => onAiRequest('solution', currentPath, node.id)}
                    aiIcon={Sparkles}
                  />
                </div>

                {/* Actions Card */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                    <div className="bg-slate-200 p-1 rounded-md text-slate-500"><CheckSquare className="w-3 h-3"/></div>
                    ACTIONS
                  </h5>
                  {(node.actions || []).map((action, i) => (
                    <ActionItem 
                      key={i} 
                      action={action} 
                      index={i} 
                      updateAction={updateAction}
                      removeAction={removeAction}
                    />
                  ))}
                  <button onClick={addAction} className="w-full py-1.5 text-[10px] font-bold text-slate-400 border border-dashed border-slate-300 rounded-lg hover:bg-white hover:text-blue-500 hover:border-blue-300 transition-all">
                    + ADD ACTION
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Children Container */}
      {!isLeaf && (
        <div className="relative mt-2 flex gap-12 items-start pt-6">
           {/* Horizontal Visual Connector for siblings */}
           {node.children.length > 1 && (
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%-20rem)] border-t border-slate-300"></div>
           )}
           
           {node.children.map((child) => (
             <div key={child.id} className="relative">
               {/* Vertical Connector from horizontal line to child */}
               <div className="absolute -top-6 left-1/2 -translate-x-1/2 h-6 w-px bg-slate-300"></div>
               <TreeNode 
                  node={child} 
                  path={currentPath}
                  onUpdate={onUpdate} 
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onAiRequest={onAiRequest}
                  level={level + 1}
               />
             </div>
           ))}
        </div>
      )}
    </div>
  );
};