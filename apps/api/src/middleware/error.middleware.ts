import type { NextFunction, Request, Response } from "express";
import { flattenError, ZodError } from "zod";

export default function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error("\n----ERROR----\n");
  console.error(err.stack);

  if (err instanceof ZodError) {
    return res.status(400).json(flattenError(err).fieldErrors);
  }
  return res.status(500).json({
    error: err.message || "An error has occured",
  });
}
