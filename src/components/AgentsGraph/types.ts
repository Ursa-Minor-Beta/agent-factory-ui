export interface GraphSizes {
  nodeWidth: number;
  slot: number; // node width + horizontal gap
  rowGap: number;
}

export interface Relation {
  source: string;
  target: string;
  via: 'agent' | 'tool' | 'builtin'; // builtin: agent -> its built-in tools node
}

export interface GraphBounds {
  minX: number;
  maxX: number;
  minY: number;
}
