package com.medverse.backend.utils.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class DuplicateResourceException extends RuntimeException {
    public DuplicateResourceException(String resourceName, String fieldName, Object fieldValue) {
        super(String.format("%s with %s '%s' already exists.", resourceName, fieldName, fieldValue));
    }
}