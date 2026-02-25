import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export function withValidation<T>(
  handler: (request: NextRequest, validated: T, params?: any) => Promise<NextResponse>,
  schema: z.ZodSchema<T>
) {
  return async (request: NextRequest, params?: any) => {
    try {
      let body;
      const contentType = request.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        body = await request.json();
      } else if (contentType?.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        body = Object.fromEntries(formData);
      } else {
        return NextResponse.json(
          { error: "Unsupported content type" },
          { status: 415 }
        );
      }

      const validated = schema.parse(body);
      return handler(request, validated, params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      console.error("Validation middleware error:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  };
}

export function withQueryValidation<T>(
  handler: (request: NextRequest, validated: T, params?: any) => Promise<NextResponse>,
  schema: z.ZodSchema<T>
) {
  return async (request: NextRequest, params?: any) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryObj = Object.fromEntries(searchParams.entries());

      // Handle array parameters
      for (const [key, values] of searchParams.entries()) {
        if (searchParams.getAll(key).length > 1) {
          queryObj[key] = searchParams.getAll(key);
        }
      }

      const validated = schema.parse(queryObj);
      return handler(request, validated, params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: "Query validation failed",
            details: error.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      console.error("Query validation middleware error:", error);
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500 }
      );
    }
  };
}

export function createValidatedRoute<T>(
  handler: (request: NextRequest, validated: T, params?: any) => Promise<NextResponse>,
  schema: z.ZodSchema<T>,
  options?: {
    validateQuery?: boolean;
  }
) {
  return options?.validateQuery
    ? withQueryValidation(handler, schema)
    : withValidation(handler, schema);
} 