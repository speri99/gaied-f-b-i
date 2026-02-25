import { WorkflowService } from "@/lib/services/workflow.service";
import { getVerifiedTenantId } from "@/lib/utils/tenant-verify";
import { NextRequest, NextResponse } from "next/server";

// POST /api/cases
export async function POST(request: NextRequest) {
    try {
        // Get the verified tenant ID from the middleware
        const tenantId = getVerifiedTenantId(request);

        const body = await request.json();
        //const validated = createCaseSchema.parse(body);

        // Ensure the case is created for the correct tenant
        const workflow = {
            ...body,
            tenantId, // Override any tenantId in the request body
            userId: request.headers.get("x-user-id") || "system",
        };
        console.log("workflow before sending to the service layer======" + workflow)
        const newCase = await WorkflowService.createWorkflow(workflow);
        if (!newCase) {
            return NextResponse.json(
              { error: "Unable to save the workflow!" },
              { status: 500 }
            );
          }
        return NextResponse.json(newCase, { status: 201 });
    } catch (error) {
        console.error('Error creating case:', error);
        if (error instanceof Error && error.message === 'Missing verified tenant ID') {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: error instanceof Error ? 400 : 500 }
        );
    }
}

// PUT /api/workflows - Update existing workflow
export async function PUT(request: NextRequest) {
    try {
        // Get the verified tenant ID from the middleware
        const tenantId = getVerifiedTenantId(request);

        const body = await request.json();

        const workflowId = body.workflowId;

        if (!workflowId) {
            return NextResponse.json(
                { error: 'Workflow ID is required for updates' },
                { status: 400 }
            );
        }

        // Ensure the workflow is updated for the correct tenant
        const workflow = {
            ...body,
            tenantId, // Override any tenantId in the request body
            workflowId, // Ensure we use the workflow ID from header
            userId: request.headers.get("x-user-id") || "system",
        };

        console.log("workflow update data before sending to service layer======", workflow);
        
        const updatedWorkflow = await WorkflowService.updateWorkflow(workflow);
        if (!updatedWorkflow) {
            return NextResponse.json(
              { error: "Unable to update the workflow!" },
              { status: 500 }
            );
        }
        return NextResponse.json(updatedWorkflow, { status: 200 });
    } catch (error) {
        console.error('Error updating workflow:', error);
        if (error instanceof Error && error.message === 'Missing verified tenant ID') {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: error instanceof Error ? 400 : 500 }
        );
    }
}

// POST /api/cases
export async function GET(request: NextRequest) {
    try {
        // Get the verified tenant ID from the middleware
        const tenantId = getVerifiedTenantId(request);
        const workflowId = request.headers.get('x-workflow-id');
        let existingWorkflows;
        console.log("Inside all GET workflows!!");
        if(!workflowId){
             existingWorkflows = await WorkflowService.getWorkflows(tenantId);
        }else{
             existingWorkflows = await WorkflowService.getWorflowData(tenantId,workflowId);
        }
        if (existingWorkflows)
            return NextResponse.json(existingWorkflows, { status: 200 });
    } catch (error) {
        console.error('Error creating case:', error);
        if (error instanceof Error && error.message === 'Missing verified tenant ID') {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: error instanceof Error ? 400 : 500 }
        );
    }
}
