import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
// @ts-ignore
import { WebsocketProvider } from 'y-websocket';
import { Node, Edge, useNodesState, useEdgesState } from 'reactflow';

export function useYjsSync(workflowId: string | null, token: string, orgId: string, user: { id: string, email: string } | null) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node[]>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge[]>([]);
  
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const undoManagerRef = useRef<Y.UndoManager | null>(null);
  const [awarenessUsers, setAwarenessUsers] = useState<Map<number, any>>(new Map());

  // Prevent infinite loops during sync
  const isUpdatingFromYjs = useRef(false);

  useEffect(() => {
    if (!workflowId || !token || !orgId || !user) return;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const wsUrl = `ws://${window.location.host}`; // The proxy handles WS upgrade, or we connect to port 3001 if direct
    const wsUrlReal = window.location.port === '5173' ? 'ws://localhost:3001' : wsUrl;

    const provider = new WebsocketProvider(
      `${wsUrlReal}/api/workflows`,
      `${workflowId}/sync?token=${token}&orgId=${orgId}`,
      ydoc,
      { connect: true }
    );
    providerRef.current = provider;

    const yNodes = ydoc.getArray<Node>('nodes');
    const yEdges = ydoc.getArray<Edge>('edges');
    
    // Set up local undo manager
    const undoManager = new Y.UndoManager([yNodes, yEdges], { trackedOrigins: new Set([provider.awareness.clientID]) });
    undoManagerRef.current = undoManager;

    // Set local awareness state
    const awareness = provider.awareness;
    awareness.setLocalStateField('user', {
      id: user.id,
      email: user.email,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
      editingNodeId: null,
      cursor: null
    });

    awareness.on('change', () => {
      setAwarenessUsers(new Map(awareness.getStates()));
    });

    // Observer: Yjs -> React Flow
    const observeYNodes = (_event: Y.YArrayEvent<Node>) => {
      isUpdatingFromYjs.current = true;
      setNodes(yNodes.toArray());
      setTimeout(() => { isUpdatingFromYjs.current = false; }, 10);
    };

    const observeYEdges = (_event: Y.YArrayEvent<Edge>) => {
      isUpdatingFromYjs.current = true;
      setEdges(yEdges.toArray());
      setTimeout(() => { isUpdatingFromYjs.current = false; }, 10);
    };

    yNodes.observe(observeYNodes);
    yEdges.observe(observeYEdges);

    return () => {
      yNodes.unobserve(observeYNodes);
      yEdges.unobserve(observeYEdges);
      provider.destroy();
      ydoc.destroy();
    };
  }, [workflowId, token, orgId, user?.id]);

  // Observer: React Flow -> Yjs
  useEffect(() => {
    if (isUpdatingFromYjs.current || !ydocRef.current || !providerRef.current) return;
    
    const yNodes = ydocRef.current.getArray<Node>('nodes');
    // Basic array replace for simplicity instead of delta patching.
    // In production, calculating deltas is better.
    ydocRef.current.transact(() => {
      yNodes.delete(0, yNodes.length);
      yNodes.insert(0, nodes);
    }, providerRef.current.awareness.clientID);
  }, [nodes]);

  useEffect(() => {
    if (isUpdatingFromYjs.current || !ydocRef.current || !providerRef.current) return;
    
    const yEdges = ydocRef.current.getArray<Edge>('edges');
    ydocRef.current.transact(() => {
      yEdges.delete(0, yEdges.length);
      yEdges.insert(0, edges);
    }, providerRef.current.awareness.clientID);
  }, [edges]);

  const undo = useCallback(() => {
    if (undoManagerRef.current) undoManagerRef.current.undo();
  }, []);

  const redo = useCallback(() => {
    if (undoManagerRef.current) undoManagerRef.current.redo();
  }, []);

  const setEditingNode = useCallback((nodeId: string | null) => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('user', {
        ...providerRef.current.awareness.getLocalState()?.user,
        editingNodeId: nodeId
      });
    }
  }, []);

  const setCursor = useCallback((cursor: { x: number, y: number } | null) => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('user', {
        ...providerRef.current.awareness.getLocalState()?.user,
        cursor
      });
    }
  }, []);

  return {
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    undo, redo,
    awarenessUsers,
    setEditingNode,
    setCursor,
    clientId: providerRef.current?.awareness.clientID
  };
}
