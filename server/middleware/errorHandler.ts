import { NextFunction, Request, Response } from "express";
import { ApiResponse } from "../types/api";

export function notFound(req: Request, res: Response, next: NextFunction) {
  const error = new ApiError(`Not found: ${req.originalUrl}`, 404);
  next(error);
}

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err instanceof ApiError ? err.status : 500;
  const message = err instanceof ApiError ? err.message : "Internal server error";

  if (status === 500) {
    console.error(`[SafeSide Error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json({
    error: status === 422 ? "NO_DATA_AVAILABLE" : message,
    detail: err.message,
  } as ApiResponse);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number = 500, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
