package com.bmwtechworks.userroleservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidCredentials(InvalidCredentialsException ex) {
        return build(HttpStatus.UNAUTHORIZED, "Unauthorized", "Invalid email or password");
    }

    /**
     * A caller asked for something they are not allowed to do — changing a role
     * without being an administrator, editing their own role, or demoting the
     * last administrator. Previously these surfaced as a 400 because they were
     * plain RuntimeExceptions, which told the client to fix their request when
     * in fact it had to stop trying.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex) {
        return build(HttpStatus.FORBIDDEN, "Forbidden", message(ex, "Access denied"));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(UserNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "Not Found", message(ex, "Not found"));
    }

    @ExceptionHandler(RoleNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleRoleNotFound(RoleNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "Not Found", message(ex, "Role not found"));
    }

    @ExceptionHandler(UserAlreadyExistsException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(UserAlreadyExistsException ex) {
        return build(HttpStatus.CONFLICT, "Conflict", message(ex, "Already exists"));
    }

    /**
     * The customer service could not be reached while removing a deleted
     * account's profile.
     *
     * <p>503 rather than the 400 the catch-all below would give it: the request
     * was well formed and the caller is allowed to make it, it just cannot be
     * carried out right now. Saying 400 would tell an administrator their delete
     * was malformed and invite them to edit it, when in fact the account is
     * still there and the same call will work once the service recovers.
     */
    @ExceptionHandler(CustomerProfileCleanupException.class)
    public ResponseEntity<Map<String, Object>> handleProfileCleanup(CustomerProfileCleanupException ex) {
        return build(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Service Unavailable",
                message(ex, "Customer service is unavailable")
        );
    }

    /**
     * Bean validation failures used to be rendered by Spring's default error
     * handling, which omits the "message" field entirely. Surface the actual
     * field errors so clients (and their toasts) show something actionable
     * instead of a bare "Bad Request".
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .collect(Collectors.joining(", "));

        return build(
                HttpStatus.BAD_REQUEST,
                "Bad Request",
                message.isBlank() ? "Request validation failed" : message
        );
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return build(HttpStatus.BAD_REQUEST, "Bad Request", message(ex, "Invalid request"));
    }

    /**
     * The services in this module report business failures with plain
     * RuntimeExceptions ("User not found with id: …", "Role not found: …").
     * Map those to 404 when they describe a missing entity and to 400
     * otherwise, so the response always carries a readable message.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        String message = message(ex, "Request could not be processed");
        boolean notFound = message.toLowerCase().contains("not found");

        return notFound
                ? build(HttpStatus.NOT_FOUND, "Not Found", message)
                : build(HttpStatus.BAD_REQUEST, "Bad Request", message);
    }

    private String message(Exception ex, String fallback) {
        String message = ex.getMessage();
        return message == null || message.isBlank() ? fallback : message;
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String error, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
