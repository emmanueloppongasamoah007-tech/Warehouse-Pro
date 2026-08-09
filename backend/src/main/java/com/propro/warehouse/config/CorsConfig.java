package com.propro.warehouse.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Allows the Expo dev server to call this API from a browser.
 *
 * Without this, the browser's preflight OPTIONS request is rejected with
 * 403 "Invalid CORS request", so fetch() fails before any response exists -
 * which surfaces in the app as a bare "Network request failed".
 *
 * These are local dev server origins only. Native iOS/Android builds send no
 * Origin header at all and are unaffected by this config either way.
 */
@Configuration
public class CorsConfig {

    private static final String[] LOCAL_DEV_ORIGINS = {
            "http://localhost:8081",   // Expo Metro dev server (expo start --web)
            "http://localhost:19006",  // Legacy Expo webpack web server
            "http://localhost:8080"    // This backend, for browser calls to its own API
    };

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                // Covers every controller: /api/routes, /api/aisles, /api/bins, /api/zones
                registry.addMapping("/api/**")
                        .allowedOrigins(LOCAL_DEV_ORIGINS)
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .maxAge(3600);
            }
        };
    }
}
