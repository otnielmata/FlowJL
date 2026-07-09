import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export function authMiddleware(request, _response, next) {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    next({
      statusCode: 401,
      message: "Authorization token was not provided"
    });
    return;
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    request.auth = payload;
    next();
  } catch (_error) {
    next({
      statusCode: 401,
      message: "Invalid or expired token"
    });
  }
}
