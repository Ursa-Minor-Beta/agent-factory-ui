export interface GraphSizes {
  nodeWidth: number;
  slot: number; // node width + horizontal gap
  rowGap: number;
}

export interface Relation {
  source: string;
  target: string;
  via: 'agent' | 'tool';
}

export interface GraphBounds {
  minX: number;
  maxX: number;
  minY: number;
}
