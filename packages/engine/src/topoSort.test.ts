import { describe, it, expect } from 'vitest';
import { topoSort } from './topoSort';
import { Node, Edge } from 'reactflow';

describe('topoSort (DAG Execution Engine)', () => {
  it('should correctly sort a valid DAG', () => {
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: {} },
      { id: '2', position: { x: 0, y: 0 }, data: {} },
      { id: '3', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ];

    const sorted = topoSort(nodes, edges);
    expect(sorted.map(n => n.id)).toEqual(['1', '2', '3']);
  });

  it('should correctly sort a branching DAG', () => {
    const nodes: Node[] = [
      { id: 'A', position: { x: 0, y: 0 }, data: {} },
      { id: 'B1', position: { x: 0, y: 0 }, data: {} },
      { id: 'B2', position: { x: 0, y: 0 }, data: {} },
      { id: 'C', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: 'eA-B1', source: 'A', target: 'B1' },
      { id: 'eA-B2', source: 'A', target: 'B2' },
      { id: 'eB1-C', source: 'B1', target: 'C' },
      { id: 'eB2-C', source: 'B2', target: 'C' },
    ];

    const sorted = topoSort(nodes, edges);
    const sortedIds = sorted.map(n => n.id);
    expect(sortedIds[0]).toBe('A');
    expect(sortedIds[3]).toBe('C');
    expect(sortedIds.includes('B1')).toBe(true);
    expect(sortedIds.includes('B2')).toBe(true);
  });

  it('should throw an error if a cycle is detected', () => {
    const nodes: Node[] = [
      { id: '1', position: { x: 0, y: 0 }, data: {} },
      { id: '2', position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-1', source: '2', target: '1' },
    ];

    expect(() => topoSort(nodes, edges)).toThrow('Cycle detected in workflow!');
  });
});
