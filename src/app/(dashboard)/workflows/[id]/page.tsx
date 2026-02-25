'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  useReactFlow,
  NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from "uuid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { NodeInspector } from '../NodeInspector';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Workflow } from '@/types/workflow';
import { randomUUID } from 'crypto';
import { useToast } from '@/hooks/use-toast';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
export const OverlayLoader = ({ show = false }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};


const initialEdges = [];

const getId = () => `node_${+new Date()}`;

const initialNodes = [
  {
    id: getId(),
    type: 'customNode',
    position: { x: 50, y: 5 },
    data: {
      nodeType: 'start',
      title: 'Start',
      duration: '',
      unit: '',
      contactMethod: '',
      contactType: '',
      contactInfo: {
        phone: '',
        email: '',
        template: ''
      }
    }
  },
];

// const CustomNode=({ data, id }: NodeProps)=>{
//   const handleChange = (value: string) => {
//     data.onChange?.(id, { ...data, title: value });
//     console.log(value);
//   };

//   return (

//     <div className="p-4 border rounded shadow bg-white w-[120px]">
//       <div className="mb-1 font-semibold text-gray-900 capitalize">{data.nodeType || "Node"}</div>

//       {data.nodeType === "wait" && (
//         <div className="text-xs text-muted-foreground">
//           Wait {data.duration} {data.unit}
//         </div>
//       )}

//       {data.nodeType === "contact" && (
//         <div className="text-xs text-muted-foreground">
//           Contacting {data.contactType} {data.contactMethod && 'over '+data.contactMethod}
//         </div>
//       )}

//        {/* Conditionally render outputs for ack */}
//        {data.nodeType === "ack" ? (
//         <>
//           <Handle
//             type="source"
//             id="yes"
//             position={Position.Right}
//             style={{background: 'green' }}
//           />
//           <Handle
//             type="source"
//             id="no"
//             position={Position.Bottom}
//             style={{background: 'red' }}
//           />
//            <Handle type="target" position={Position.Left} />
//         </>
//       ) : (
//         <>
//           {/* Default success/failure for other node types */}
//           <Handle type="target" position={Position.Left} />
//           <Handle type="source" id="success" position={Position.Right} style={{ background: 'green' }} />
//           <Handle type="source" id="failure" position={Position.Bottom} style={{ background: 'red' }} />
//         </>
//       )}
//     </div>
//   );
// }
const CustomNode = ({ data, id }: NodeProps) => {
  const handleChange = (value: string) => {
    data.onChange?.(id, { ...data, title: value });
    console.log(value);
  };

  const isStart = data.nodeType === 'start';
  const isStop = data.nodeType === 'stop';
  const isAck = data.nodeType === 'ack';

  return (
    <div className="p-4 border rounded shadow bg-white w-[120px]">
      <div className="mb-1 font-semibold text-gray-900 capitalize">{data.nodeType || "Node"}</div>

      {data.nodeType === "wait" && (
        <div className="text-xs text-muted-foreground">
          Wait {data.duration} {data.unit}
        </div>
      )}

      {data.nodeType === "contact" && (
        <div className="text-xs text-muted-foreground">
          Contacting {data.contactType} {data.contactMethod && 'over ' + data.contactMethod}
        </div>
      )}

      {/* Conditional Handles */}
      {isAck ? (
        <>
          {!isStart && <Handle type="target" position={Position.Left} />}
          {!isStop && (
            <>
              <Handle type="source" id="yes" position={Position.Right} style={{ background: 'green' }} />
              <Handle type="source" id="no" position={Position.Bottom} style={{ background: 'red' }} />
            </>
          )}
        </>
      ) : (
        <>
          {!isStart && <Handle type="target" position={Position.Left} />}
          {!isStop && (
            <>
              <Handle type="source" id="success" position={Position.Right} style={{ background: 'green' }} />
              {/* <Handle type="source" id="failure" position={Position.Bottom} style={{ background: 'red' }} /> */}
            </>
          )}
        </>
      )}
    </div>
  );
};

const nodeTypes = {
  customNode: CustomNode,
};



const FlowCanvas = () => {
  const router = useRouter();
  const { createAuthHeaders, user, loading: authLoading, isAuthenticated } = useAuth();
  const [selectedNode, setSelectedNode] = useState(initialEdges[0]);
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();
  const { toast } = useToast();
  const params = useParams();
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');

  useEffect(() => {
    setLoading(true);
    const fetchWorkflow = async () => {
      if (params.id === 'new') {
        setLoading(false);
        return;
      }
      try {

        const headers = await createAuthHeaders();
        const response = await fetch(`/api/workflows`, {
          headers: {
            ...headers,
            'x-workflow-id': params.id, // 👈 send workflowId in header
          },
        });

        if (!response.ok) throw new Error('Failed to fetch workflow');

        const data = await response.json();
        if (data && data.items && data.items.length > 0) {
          setWorkflow(data);
          setWorkflowName(data.items[0].workflowName);
          setNodes(data.items[0].workflowSequence?.nodes);
          setEdges(data.items[0].workflowSequence?.edges);
        }

      } catch (error) {
        console.error('Error fetching workflow:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated) {
      fetchWorkflow();
    }
  }, [params.id, authLoading, isAuthenticated]);

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };
  const onNodeClick = (event, node) => {
    event.stopPropagation();
    setSelectedNode(node);
  };

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      const newNode = {
        id: getId(),
        type: 'customNode',
        position,
        data: {
          nodeType: 'wait',
          title: 'Wait',
          duration: '5',
          unit: 'minutes',
          contactMethod: '',
          contactType: '',
          contactInfo: {
            phone: '',
            email: '',
            template: ''
          }
        }
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      // when a connection is dropped on the pane it's not valid
      if (!connectionState.isValid) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const id = getId();
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;
        const newNode = {
          id,
          position: screenToFlowPosition({
            x: clientX,
            y: clientY,
          }),
          type: 'customNode',
          data: {
            nodeType: 'wait',
            title: 'Wait',
            duration: '5',
            unit: 'minutes',
            contactMethod: '',
            contactType: '',
            contactInfo: {
              phone: '',
              email: '',
              template: ''
            }
          }
          //origin: [0.5, 0.0],
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({ id, source: connectionState.fromNode.id, target: id }),
        );
      }
    },
    [screenToFlowPosition],
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onConnect = useCallback((params) => {
    const label =
      params.sourceHandle === "yes" ? "Yes" :
        params.sourceHandle === "no" ? "No" :
          params.sourceHandle === "success" ? "Success" :
            "Failure";

    setEdges((eds) =>
      addEdge(
        {
          ...params,
          label,
          animated: true,
          style: {
            stroke:
              label === "Yes" ? "green" :
                label === "No" ? "red" :
                  "black",
          },
        },
        eds
      )
    );
  }, []);


  const handleUpdateWorkflow = async () => {
    const nodes = getNodes();
    const edges = getEdges();

    // Strip extra props or transform
    const workflowSequence = {
      nodes: nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data,
      })),
      edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
      })),
    };

    const stepFunctionDef = convertWorkflowToStepFunction({ workflowSequence, workflowName });

    const updatedWorkflow = {
      workflowId: params.id, // Use existing workflow ID
      tenantId: user.tenantId,
      workflowName: workflowName, // Use existing workflow name
      workflowSequence: workflowSequence,
      workflowStepFunction: stepFunctionDef.stepFunction,
      updatedBy: user.userId,
      status: 'ACTIVE',
      updatedAt: new Date().toISOString()
    };

    console.log("Updated workflow:", JSON.stringify(workflowSequence, null, 2));

    try {
      const updateWorkflowResponse = await fetch('/api/workflows', {
        method: "PUT", // or PATCH depending on your API
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": user.tenantId || '',
          "x-user-id": user.userId || '', // Send workflow ID in header
        },
        body: JSON.stringify(updatedWorkflow)
      });

      if (!updateWorkflowResponse.ok) throw new Error("Failed to update Workflow");

      toast({
        title: "Success",
        description: "Workflow updated successfully",
      });

      router.back();
    } catch (error) {
      console.error('Error updating workflow:', error);
      toast({
        title: "Error",
        description: "Failed to update workflow",
        variant: "destructive",
      });
    }
  };

  const handleSaveWorkflow = async (name: string) => {
    const nodes = getNodes();
    const edges = getEdges();

    // Optional: strip extra props or transform
    const workflow = {
      nodes: nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data,
      })),
      edges: edges.map(({ id, source, target, sourceHandle, targetHandle }) => ({
        id,
        source,
        target,
        sourceHandle,
        targetHandle,
      })),
    };

    const stepFunctionDef = convertWorkflowToStepFunction(workflow);

    const newWorkflow: Workflow = {
      workflowId: uuidv4(),
      tenantId: user.tenantId,
      workflowName: name,
      workflowSequence: workflow,
      workflowStepFunction: stepFunctionDef.stepFunction,
      createdBy: user.userId,
      status: 'ACTIVE',
      createdAt: ''
    }

    console.log("Saved workflow:", JSON.stringify(workflow, null, 2));

    /* Optionally trigger a download
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "workflow.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url); */


    const createWorkflowResponse = await fetch('/api/workflows', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tenant-id": user.tenantId || '',
        "x-user-id": user.userId || '',
      },
      body: JSON.stringify(newWorkflow)
    })

    if (!createWorkflowResponse.ok) throw new Error("Failed to add Workflow");

    toast({
      title: "Success",
      description: "Note added successfully",
    });

    router.back();


  };
  function convertReactFlowToStepFunction(workflowData) {
    const { workflowSequence, workflowName } = workflowData;
    const { nodes, edges } = workflowSequence;

    // Create a map for quick node lookup
    const nodeMap = {};
    nodes.forEach(node => {
      nodeMap[node.id] = node;
    });

    // Find the start node
    const startNode = nodes.find(node => node.data.nodeType === 'start');
    if (!startNode) {
      throw new Error('No start node found in workflow');
    }

    // Find the first node after start
    const startEdge = edges.find(edge => edge.source === startNode.id);
    const firstNodeId = startEdge ? startEdge.target : null;

    if (!firstNodeId) {
      throw new Error('No node connected to start node');
    }

    const stepFunctionDefinition = {
      Comment: `Generated from ReactFlow workflow: ${workflowName}`,
      StartAt: getStateName(nodeMap[firstNodeId]),
      States: {}
    };

    // Process each node and convert to Step Function states
    nodes.forEach(node => {
      if (node.data.nodeType === 'start') return; // Skip start node

      const stateName = getStateName(node);
      const state = convertNodeToState(node, edges, nodeMap);

      if (state) {
        stepFunctionDefinition.States[stateName] = state;
      }
    });

    return stepFunctionDefinition;
  }

  function getStateName(node) {
    return `${node.data.title}_${node.id.split('_')[1]}`;
  }

  function convertNodeToState(node, edges, nodeMap) {
    const { nodeType, title } = node.data;

    switch (nodeType) {
      case 'contact':
        return createContactState(node, edges, nodeMap);

      case 'wait':
        return createWaitState(node, edges, nodeMap);

      case 'ack':
        return createAckState(node, edges, nodeMap);

      case 'stop':
        return createStopState(node);

      default:
        console.warn(`Unknown node type: ${nodeType}`);
        return null;
    }
  }

  function createContactState(node, edges, nodeMap) {
    const { contactMethod, contactType, contactInfo } = node.data;
    const nextState = getNextState(node.id, edges, nodeMap);

    // This represents invoking a Lambda function for contact
    const state = {
      Type: "Task",
      Resource: "arn:aws:states:::lambda:invoke",
      Parameters: {
        FunctionName: "arn:aws:lambda:us-east-1:123456789012:function:ContactService",
        Payload: {
          contactMethod: contactMethod,
          contactType: contactType,
          contactInfo: contactInfo,
          nodeId: node.id
        }
      },
      ResultPath: "$.contactResult",
      TimeoutSeconds: 300,
      Retry: [
        {
          ErrorEquals: ["Lambda.ServiceException", "Lambda.AWSLambdaException"],
          IntervalSeconds: 2,
          MaxAttempts: 3,
          BackoffRate: 2
        }
      ],
      Catch: [
        {
          ErrorEquals: ["States.ALL"],
          Next: "ContactError",
          ResultPath: "$.error"
        }
      ]
    };

    if (nextState) {
      state.Next = nextState;
    } else {
      state.End = true;
    }

    return state;
  }

  function createWaitState(node, edges, nodeMap) {
    const { duration, unit } = node.data;
    const nextState = getNextState(node.id, edges, nodeMap);

    // Convert duration to seconds
    let seconds = parseInt(duration) || 5;
    if (unit === 'minutes') {
      seconds = seconds * 60;
    } else if (unit === 'hours') {
      seconds = seconds * 3600;
    }

    const state = {
      Type: "Wait",
      Seconds: seconds
    };

    if (nextState) {
      state.Next = nextState;
    } else {
      state.End = true;
    }

    return state;
  }

  function createAckState(node, edges, nodeMap) {
    // This is a choice state that checks if acknowledgment was received
    const yesEdge = edges.find(edge =>
      edge.source === node.id && edge.sourceHandle === 'yes'
    );
    const noEdge = edges.find(edge =>
      edge.source === node.id && edge.sourceHandle === 'no'
    );

    const state = {
      Type: "Choice",
      Choices: []
    };

    // Handle YES path (acknowledged = true)
    if (yesEdge && nodeMap[yesEdge.target]) {
      state.Choices.push({
        Variable: "$.contactResult.acknowledged",
        BooleanEquals: true,
        Next: getStateName(nodeMap[yesEdge.target])
      });
    }

    // Handle NO path (acknowledged = false)
    if (noEdge && nodeMap[noEdge.target]) {
      state.Choices.push({
        Variable: "$.contactResult.acknowledged",
        BooleanEquals: false,
        Next: getStateName(nodeMap[noEdge.target])
      });
    }

    // If we have both paths but no default fallback needed
    if (state.Choices.length > 0) {
      // Add a default case if acknowledgment field is missing/null
      if (noEdge && nodeMap[noEdge.target]) {
        state.Default = getStateName(nodeMap[noEdge.target]);
      } else if (yesEdge && nodeMap[yesEdge.target]) {
        state.Default = getStateName(nodeMap[yesEdge.target]);
      }
    }

    // If no specific paths, end the execution
    if (state.Choices.length === 0) {
      return {
        Type: "Pass",
        Result: "No acknowledgment paths defined",
        End: true
      };
    }

    return state;
  }

  function createStopState(node) {
    return {
      Type: "Pass",
      Result: {
        message: "Workflow completed successfully",
        nodeId: node.id,
        timestamp: new Date().toISOString()
      },
      End: true
    };
  }

  const getNextState = (nodeId, edges, nodeMap) => {
    const nextEdge = edges.find(edge =>
      edge.source === nodeId && !edge.sourceHandle
    );

    if (nextEdge && nodeMap[nextEdge.target]) {
      return getStateName(nodeMap[nextEdge.target]);
    }

    return null;
  }

  // Add error handling state to the definition
  const addErrorHandlingStates = (stepFunctionDefinition) => {
    stepFunctionDefinition.States.ContactError = {
      Type: "Pass",
      Parameters: {
        error: "Contact service failed",
        cause: "$.error.Cause",
        timestamp: "$.error.Timestamp"
      },
      End: true
    };

    return stepFunctionDefinition;
  }

  const convertWorkflowToStepFunction = (workflowData) => {
    try {
      let stepFunction = convertReactFlowToStepFunction(workflowData);
      stepFunction = addErrorHandlingStates(stepFunction);

      console.log(stepFunction);

      return {
        success: true,
        stepFunction: stepFunction,
        metadata: {
          workflowId: workflowData.workflowId,
          workflowName: workflowData.workflowName,
          nodeCount: workflowData.workflowSequence.nodes.length,
          edgeCount: workflowData.workflowSequence.edges.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        stepFunction: null
      };
    }
  }

  return (
    <div className="flex">
      <div className="flex-1 h-screen" ref={reactFlowWrapper}>
        <OverlayLoader show={loading} />
        <div className="p-2 border-b flex justify-end bg-background">
          {params.id === 'new' ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)}>Save Workflow</Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Name Your Workflow</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Label htmlFor="workflow-name">Workflow Name</Label>
                  <Input
                    id="workflow-name"
                    placeholder="Enter a name..."
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                  />
                </div>
                <DialogFooter className="mt-6">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      setIsDialogOpen(false);
                      handleSaveWorkflow(workflowName);
                    }}
                    disabled={!workflowName.trim()}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button onClick={() => handleUpdateWorkflow()}>
              Update Workflow
            </Button>
          )}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectEnd={onConnectEnd}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <MiniMap />
          <Controls />
          <Background />
        </ReactFlow>
      </div>

      {/* NodeInspector as right sidebar */}
      {selectedNode && (
        <div className="w-[320px] border-l bg-white shadow-md px-4 py-6 h-screen overflow-y-auto">
          <NodeInspector node={selectedNode} onUpdate={updateNodeData} />
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}