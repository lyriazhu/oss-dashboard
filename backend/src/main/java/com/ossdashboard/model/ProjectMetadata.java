package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Project metadata extracted from GitHub
 */
public class ProjectMetadata {
    public String name;
    
    @JsonProperty("full_name")
    public String fullName;
    
    public String description;
    
    @JsonProperty("created_at")
    public String createdAt;
    
    @JsonProperty("updated_at")
    public String updatedAt;
    
    public Integer stars;
    public Integer forks;
    public Integer watchers;
    
    @JsonProperty("open_issues")
    public Integer openIssues;
    
    public String language;
    public List<String> topics;
    public String license;
    public String homepage;
    
    @JsonProperty("has_wiki")
    public Boolean hasWiki;
    
    @JsonProperty("has_discussions")
    public Boolean hasDiscussions;
    
    @JsonProperty("extracted_at")
    public String extractedAt;
}

// Made with Bob
