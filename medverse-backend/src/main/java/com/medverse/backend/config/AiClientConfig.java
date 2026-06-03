package com.medverse.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

@Configuration
public class AiClientConfig {

    @Value("${medverse.ai.base-url:http://localhost:8000}")
    private String aiBaseUrl;

    @Value("${medverse.ai.timeout-ms:5000}")
    private Long timeoutMs;

    @Bean
    public WebClient aiWebClient(WebClient.Builder builder) {
        return builder
                .baseUrl(aiBaseUrl)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
    }

    @Bean
    public Duration aiTimeout() {
        return Duration.ofMillis(timeoutMs);
    }
}