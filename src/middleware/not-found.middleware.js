export function notFoundMiddleware(_request, response) {
  response.status(404).json({
    message: "Route not found"
  });
}
