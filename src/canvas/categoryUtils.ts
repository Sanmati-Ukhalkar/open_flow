export interface CategoryInfo {
  name: string;
  badge: string;
  colorClass: string;
  badgeClass: string;
  iconColor: string;
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  // AI / Machine Learning
  'llm-prompt': {
    name: 'AI',
    badge: 'AI',
    colorClass: 'border-purple-500/30 bg-purple-500/5',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
  },
  'vision-ocr': {
    name: 'AI',
    badge: 'AI',
    colorClass: 'border-purple-500/30 bg-purple-500/5',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    iconColor: 'text-purple-400',
  },

  // MCP Tools
  'mcp-tool': {
    name: 'MCP',
    badge: 'MCP',
    colorClass: 'border-cyan-500/30 bg-cyan-500/5',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },

  // Storage & Databases
  'sqlite-storage': {
    name: 'Storage',
    badge: 'STORAGE',
    colorClass: 'border-emerald-500/30 bg-emerald-500/5',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  'vector-store': {
    name: 'Storage',
    badge: 'STORAGE',
    colorClass: 'border-emerald-500/30 bg-emerald-500/5',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  'vector-retrieve': {
    name: 'Storage',
    badge: 'STORAGE',
    colorClass: 'border-emerald-500/30 bg-emerald-500/5',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },

  // Triggers
  'cron-trigger': {
    name: 'Trigger',
    badge: 'TRIGGER',
    colorClass: 'border-amber-500/30 bg-amber-500/5',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  'webhook-trigger': {
    name: 'Trigger',
    badge: 'TRIGGER',
    colorClass: 'border-amber-500/30 bg-amber-500/5',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
  },
  'file-trigger': {
    name: 'Trigger',
    badge: 'TRIGGER',
    colorClass: 'border-amber-500/30 bg-amber-500/5',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    iconColor: 'text-amber-400',
  },

  // Logic & Execution
  'branch': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-pink-500/30 bg-pink-500/5',
    badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
  },
  'loop': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-pink-500/30 bg-pink-500/5',
    badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
  },
  'code-execution': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-pink-500/30 bg-pink-500/5',
    badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
  },
  'text-transform': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-pink-500/30 bg-pink-500/5',
    badgeClass: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
    iconColor: 'text-pink-400',
  },

  // Communication & API
  'email': {
    name: 'Communication',
    badge: 'COMM',
    colorClass: 'border-sky-500/30 bg-sky-500/5',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    iconColor: 'text-sky-400',
  },
  'http-webhook': {
    name: 'Communication',
    badge: 'COMM',
    colorClass: 'border-sky-500/30 bg-sky-500/5',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    iconColor: 'text-sky-400',
  },
};

const DEFAULT_CATEGORY: CategoryInfo = {
  name: 'General',
  badge: 'NODE',
  colorClass: 'border-zinc-800 bg-zinc-900/50',
  badgeClass: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  iconColor: 'text-zinc-400',
};

export function getNodeCategory(type: string): CategoryInfo {
  return CATEGORY_MAP[type] || DEFAULT_CATEGORY;
}
