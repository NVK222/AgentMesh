import type { Handler, NextFunction, Request, Response } from "express";

export default function asyncHandler(caller: Handler) {
  const func = (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(caller(req, res, next)).catch(next);
  };
  return func;
}
