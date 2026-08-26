export interface CategoryInfo {
  name: string;
  badge: string;
  colorClass: string;
  badgeClass: string;
  iconColor: string;
}

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  // AI / Machine Learning (Violet / Purple)
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

  // MCP Tools (Teal / Turquoise — Distinct from Cyan and Sky)
  'mcp-tool': {
    name: 'MCP',
    badge: 'MCP',
    colorClass: 'border-teal-500/30 bg-teal-500/5',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    iconColor: 'text-teal-400',
  },

  // Storage & Databases (Indigo / Sapphire — Distinct from Emerald)
  'sqlite-storage': {
    name: 'Storage',
    badge: 'STORAGE',
    colorClass: 'border-indigo-500/30 bg-indigo-500/5',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  'vector-store': {
    name: 'Storage',
    badge: 'STORAGE',
    colorClass: 'border-indigo-500/30 bg-indigo-500/5',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  'vector-retrieve': {
    name: 'Storage',
    badge: 'STORAGE',
    colorClass: 'border-indigo-500/30 bg-indigo-500/5',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },

  // Triggers (Orange / Coral — Distinct from Amber Warning)
  'cron-trigger': {
    name: 'Trigger',
    badge: 'TRIGGER',
    colorClass: 'border-orange-500/30 bg-orange-500/5',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  'webhook-trigger': {
    name: 'Trigger',
    badge: 'TRIGGER',
    colorClass: 'border-orange-500/30 bg-orange-500/5',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    iconColor: 'text-orange-400',
  },
  'file-trigger': {
    name: 'Trigger',
    badge: 'TRIGGER',
    colorClass: 'border-orange-500/30 bg-orange-500/5',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    iconColor: 'text-orange-400',
  },

  // Logic & Execution (Fuchsia / Magenta — Distinct from Rose Error)
  'branch': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-fuchsia-500/30 bg-fuchsia-500/5',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
  'loop': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-fuchsia-500/30 bg-fuchsia-500/5',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
  'code-execution': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-fuchsia-500/30 bg-fuchsia-500/5',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },
  'text-transform': {
    name: 'Logic',
    badge: 'LOGIC',
    colorClass: 'border-fuchsia-500/30 bg-fuchsia-500/5',
    badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
    iconColor: 'text-fuchsia-400',
  },

  // Communication & API (Cyan / Electric Blue — Distinct from Sky Running status)
  'email': {
    name: 'Communication',
    badge: 'COMM',
    colorClass: 'border-cyan-500/30 bg-cyan-500/5',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
  'http-webhook': {
    name: 'Communication',
    badge: 'COMM',
    colorClass: 'border-cyan-500/30 bg-cyan-500/5',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    iconColor: 'text-cyan-400',
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
