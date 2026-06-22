package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Project model representing an open-source project
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Project {
    private String id;
    private String name;
    private String githubUrl;
    private String owner;
    private String repo;
    private String foundation;
    private String website;
    private boolean enabled;
}

// Made with Bob
