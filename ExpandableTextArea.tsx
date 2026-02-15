import React, { useState } from 'react';
import { Bot, Maximize2, Minimize2, LucideIcon } from 'lucide-react';

interface ExpandableTextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  baseClassName?: string;
  collapsedHeightClass?: string;
  onAiRequest?: () => void;
  aiIcon?: LucideIcon;
}

export const ExpandableTextArea: React.FC<ExpandableTextAreaProps> = ({ 
  value, 
  onChange, 
  placeholder, 
  baseClassName = "", 
  collapsedHeightClass = "h-14", 
  onAiRequest,
  aiIcon: AiIcon = Bot
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative w-full">
      <textarea
        placeholder={placeholder}
        className={`w-full text-sm outline-none bg-transparent transition-all duration-200 ${baseClassName} ${
          isExpanded 
            ? 'min-h-[16rem] resize-y p-1' // Expanded state
            : `${collapsedHeightClass} resize-none` // Collapsed state
        }`}
        value={value}
        onChange={onChange}
      />
      
      <div className="absolute bottom-0 right-0 flex gap-1 p-1 bg-white/70 backdrop-blur-[2px] rounded-tl-md">
         {onAiRequest && (
            <button
              onClick={onAiRequest}
              className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
              title="AI Assist"
            >
              <AiIcon className="w-3 h-3" />
            </button>
         )}
         <button 
           onClick={() => setIsExpanded(!isExpanded)}
           className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
           title={isExpanded ? "Collapse" : "Expand to view all"}
         >
           {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
         </button>
      </div>
    </div>
  );
};