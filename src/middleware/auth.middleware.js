import { tokenService } from "../services/token.service.js";

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
    const payload = tokenService.verifyAccessToken(token);

    if (payload.type !== "access") {
      throw new Error("Invalid token type");
    }

    request.auth = payload;
    next();
  } catch (_error) {
    next({
      statusCode: 401,
      message: "Invalid or expired token"
    });
  }
}
