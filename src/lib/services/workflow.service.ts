import { Workflow } from "@/types/workflow";
import { ActionLogService } from "./action-log.service";
import { DynamoDBService } from "../dynamodb";

const db = new DynamoDBService();
const TABLE_NAME = process.env.DYNAMODB_WORKFLOW_TABLE;
export class WorkflowService {

    static async getWorkflows(tenantId: string) {
        try {
            const tenatResults = await db.query<Workflow>(
                "GEO-Workflow",
                {
                    KeyConditionExpression: "tenantId = :tenantId",
                    ExpressionAttributeValues: { ":tenantId": tenantId },
                }
            );
            return tenatResults
        } catch (error) {
            console.log("Error while fetching workflows of tenant");
        }
        return;
    }

    static async getWorflowData(tenatnId:string,workflowId:string){
        try{
            const response = await db.query(
                "GEO-Workflow",
                {
                  KeyConditionExpression: "tenantId = :tenantId AND workflowId = :workflowId",
                  ExpressionAttributeValues: {
                    ":tenantId": tenatnId,
                    ":workflowId": workflowId,
                  },
                }
              );
              return response;
        }catch(error){
            console.log("Error while fetching workflow data");
        }
        return;
    }

    static async createWorkflow(data: Workflow & { userId: string }) {
        try{
            console.log("worflow data inside service---" + data)
            const createdCase=await db.put({ tableName: TABLE_NAME, item: data });
            return {
                ...createdCase
            };
        }catch(error){
            console.log("Error saving the wrokflow");
            return;
        }
     
    }


    static async updateWorkflow(data: Workflow & { userId: string }) {
        try {
            console.log("workflow update data inside service---", data);
            
            // First, check if the workflow exists
            const existingWorkflow = await db.query(
                TABLE_NAME,
                {
                    KeyConditionExpression: "tenantId = :tenantId AND workflowId = :workflowId",
                    ExpressionAttributeValues: {
                        ":tenantId": data.tenantId,
                        ":workflowId": data.workflowId,
                    },
                }
            );

            if (!existingWorkflow || !existingWorkflow.items || existingWorkflow.items.length === 0) {
                throw new Error("Workflow not found");
            }

            // Update the workflow
            const updatedWorkflow = await db.put({ 
                tableName: TABLE_NAME, 
                item: {
                    ...data,
                    updatedAt: new Date().toISOString()
                }
            });
            
            return {
                ...updatedWorkflow
            };
        } catch (error) {
            console.log("Error updating the workflow", error);
            throw error; // Re-throw to handle in the route
        }
    }

    static async deleteWorkflow(tenantId: string, workflowId: string) {
        // try {
        //     const deletedWorkflow = await db.delete({
        //         tableName: TABLE_NAME,
        //         key: {
        //             tenantId: tenantId,
        //             workflowId: workflowId
        //         }
        //     });
        //     return deletedWorkflow;
        // } catch (error) {
        //     console.log("Error deleting the workflow", error);
        //     return;
        // }
    }

}