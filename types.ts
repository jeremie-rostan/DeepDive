import { LucideIcon } from 'lucide-react';

export type Action = {
  description: string;
  assignee: string;
  deadline: string;
};

export type TreeNodeData = {
  id: string;
  type: 'problem' | 'why';
  title?: string; // Only for problem nodes
  text: string;
  children: TreeNodeData[];
  rootCause?: string;
  solutionsText?: string;
  actions: Action[];
};

export type Persona = {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  fgColor: string;
  textColor: string;
  borderColor?: string;
  lightColor?: string;
  description: string;
  imageUrl: string; // URL for the character avatar
};

export type AppState = {
  title: string;
  contextDescription: string; // General description/purpose of the analysis
  problemTrees: TreeNodeData[];
  ultimateCause: string;
  ultimateSolutionsText: string;
  ultimateActions: Action[];
};

export type PathItem = {
  text: string;
  type: string;
};