import { 
  BrainCircuit, 
  Lightbulb, 
  Sun, 
  Gavel, 
  Heart, 
  Search 
} from 'lucide-react';
import { Persona, TreeNodeData, AppState } from './types';

// Using the custom icons provided by the user.
export const PERSONAS: Record<string, Persona> = {
  conductor: {
    id: 'conductor',
    name: 'The Conductor',
    icon: BrainCircuit,
    color: 'bg-blue-600',
    fgColor: 'text-white',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    lightColor: 'bg-blue-50',
    description: "Orchestrate the analysis. Keep the process structured and ensure all parts align with the ultimate goal.",
    imageUrl: "https://i.postimg.cc/BZ2mQ0Y7/Screenshot-2026-02-14-at-10-33-30-AM.png"
  },
  creative: {
    id: 'creative',
    name: 'The Creative',
    icon: Lightbulb,
    color: 'bg-emerald-500',
    fgColor: 'text-white',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    lightColor: 'bg-emerald-50',
    description: "Think outside the box. Explore non-obvious connections and innovative solutions.",
    imageUrl: "https://i.postimg.cc/4NLVX2gF/Screenshot-2026-02-14-at-10-37-06-AM.png"
  },
  optimist: {
    id: 'optimist',
    name: 'The Optimist',
    icon: Sun,
    color: 'bg-amber-400',
    fgColor: 'text-amber-950',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    lightColor: 'bg-amber-50',
    description: "Focus on opportunities. Why might this work? What is the silver lining?",
    imageUrl: "https://i.postimg.cc/90cZQv01/Screenshot-2026-02-14-at-10-36-26-AM.png"
  },
  judge: {
    id: 'judge',
    name: 'The Judge',
    icon: Gavel,
    color: 'bg-slate-700',
    fgColor: 'text-white',
    textColor: 'text-slate-700',
    borderColor: 'border-slate-300',
    lightColor: 'bg-slate-100',
    description: "Critical evaluation. Is there evidence or counter-evidence? Is this logical or practical?",
    imageUrl: "https://i.postimg.cc/L8Wt3CQZ/Screenshot-2026-02-14-at-10-35-58-AM.png"
  },
  heart: {
    id: 'heart',
    name: 'The Heart',
    icon: Heart,
    color: 'bg-rose-500',
    fgColor: 'text-white',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    lightColor: 'bg-rose-50',
    description: "Consider the human element. How did you feel? How will people feel?",
    imageUrl: "https://i.postimg.cc/Nfgksrrs/Screenshot-2026-02-14-at-10-35-31-AM.png"
  },
  detective: {
    id: 'detective',
    name: 'The Detective',
    icon: Search,
    color: 'bg-white',
    fgColor: 'text-slate-900',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-300 shadow-sm ring-1 ring-slate-100',
    lightColor: 'bg-slate-100',
    description: "Stick to the facts. Follow the evidence trail wherever it leads.",
    imageUrl: "https://i.postimg.cc/brPH2ZC3/Screenshot-2026-02-14-at-10-34-56-AM.png"
  }
};

export const INITIAL_TREE_NODE = (type: 'problem' | 'why' = 'why'): TreeNodeData => ({
  id: crypto.randomUUID(),
  type, 
  text: "",
  children: [],
  rootCause: "",
  solutionsText: "",
  actions: []
});

export const INITIAL_STATE: AppState = {
  title: "5 Why Analysis App",
  contextDescription: "",
  problemTrees: [
    {
      ...INITIAL_TREE_NODE('problem'),
      title: "Problem Statement 1",
      children: [INITIAL_TREE_NODE('why')]
    }
  ],
  ultimateCause: "",
  ultimateSolutionsText: "",
  ultimateActions: []
};