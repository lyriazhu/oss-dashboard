package com.ossdashboard;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Main application class for OSS Dashboard Backend
 * 
 * This Spring Boot application provides REST APIs to serve
 * open-source project metrics and contributor data.
 */
@SpringBootApplication
public class OssDashboardApplication {

    public static void main(String[] args) {
        SpringApplication.run(OssDashboardApplication.class, args);
    }
}

// Made with Bob
