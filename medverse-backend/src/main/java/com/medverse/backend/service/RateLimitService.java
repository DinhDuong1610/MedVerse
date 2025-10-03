package com.medverse.backend.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimitService {
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();

    public Bucket resolveBucket(String ipAddress) {
        return cache.computeIfAbsent(ipAddress, this::newBucket);
    }

    private Bucket newBucket(String ipAddress) {
        Bandwidth limit = Bandwidth.classic(10, Refill.greedy(10, Duration.ofMinutes(1)));

        return Bucket.builder()
                .addLimit(limit)
                .build();
    }
}