package com.medverse.backend.utils.exception;

import com.medverse.backend.payload.ApiResponse;

import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Object>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));

        ApiResponse<Object> response = new ApiResponse<>("ERROR", "Invalid input data.", errors, null);
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Object>> handleResourceNotFoundException(ResourceNotFoundException ex,
            WebRequest request) {
        ApiResponse<Object> response = new ApiResponse<>("ERROR", ex.getMessage(), null, null);
        return new ResponseEntity<>(response, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiResponse<Object>> handleDuplicateResourceException(DuplicateResourceException ex,
            WebRequest request) {
        ApiResponse<Object> response = new ApiResponse<>("ERROR", ex.getMessage(), null, null);
        return new ResponseEntity<>(response, HttpStatus.CONFLICT);
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<ApiResponse<Object>> handleTokenRefreshException(TokenRefreshException ex,
            WebRequest request) {
        ApiResponse<Object> response = new ApiResponse<>("ERROR", "Token refresh failed. Please log in again.",
                ex.getMessage(), null);
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse<Object>> handleAuthenticationException(AuthenticationException ex,
            WebRequest request) {
        log.warn("Authentication failed: {}", ex.getMessage());
        ApiResponse<Object> response = new ApiResponse<>("ERROR", "Authentication Failed: " + ex.getMessage(), null,
                null);
        return new ResponseEntity<>(response, HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<String>> handleUncaughtException(Exception ex, WebRequest request) {
        log.error("Unhandled exception occurred: {}", ex.getMessage(), ex);

        ApiResponse<String> response = new ApiResponse<>("ERROR",
                "An unexpected server error occurred. Please try again later.", null, null);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}