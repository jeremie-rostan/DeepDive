import React from 'react';
import { CheckSquare, X, User, Calendar } from 'lucide-react';
import { Action } from '../types';

interface ActionItemProps {
  action: Action;
  index: number;
  updateAction: (index: number, field: keyof Action, value: string) => void;
  removeAction: (index: number) => void;
}

export const ActionItem: React.FC<ActionItemProps> = ({ action, index, updateAction, removeAction }) => (
  <div className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm mb-2 transition-all hover:shadow-md">
    <div className="flex items-start gap-2">
      <CheckSquare className="w-4 h-4 mt-1 text-gray-400" />
      <input
        type="text"
        placeholder="Describe action..."
        className="flex-1 bg-transparent outline-none text-sm font-medium"
        value={action.description}
        onChange={(e) => updateAction(index, 'description', e.target.value)}
      />
      <button onClick={() => removeAction(index)} className="text-gray-400 hover:text-red-500 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
    <div className="flex gap-2 pl-6">
      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
        <User className="w-3 h-3 text-gray-500" />
        <input
          type="text"
          placeholder="Assignee"
          className="bg-transparent text-xs w-20 outline-none text-gray-600"
          value={action.assignee}
          onChange={(e) => updateAction(index, 'assignee', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-100">
        <Calendar className="w-3 h-3 text-gray-500" />
        <input
          type="text"
          placeholder="Due Date"
          className="bg-transparent text-xs w-20 outline-none text-gray-600"
          value={action.deadline}
          onChange={(e) => updateAction(index, 'deadline', e.target.value)}
        />
      </div>
    </div>
  </div>
);