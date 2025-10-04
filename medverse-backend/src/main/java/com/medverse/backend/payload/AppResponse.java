package com.medverse.backend.payload;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppResponse<T> {
    private String status;
    private String message;
    private T data;
    private Object metadata;
}