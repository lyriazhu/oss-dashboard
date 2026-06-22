package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Project metadata extracted from GitHub
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMetadata {
    private String name;
    
    @JsonProperty("full_name")
    private String fullName;
    
    private String description;
    
    @JsonProperty("created_at")
    private String createdAt;
    
    @JsonProperty("updated_at")
    private String updatedAt;
    
    private Integer stars;
    private Integer forks;
    private Integer watchers;
    
    @JsonProperty("open_issues")
    private Integer openIssues;
    
    private String language;
    private List<String> topics;
    private String license;
    private String homepage;
    
    @JsonProperty("has_wiki")
    private Boolean hasWiki;
    
    @JsonProperty("has_discussions")
    private Boolean hasDiscussions;
    
    @JsonProperty("extracted_at")
    private String extractedAt;
}

// Made with Bob
