package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request DTO for adding a new project
 */
public class AddProjectRequest {
    
    @JsonProperty("github_url")
    private String githubUrl;
    
    private String foundation;
    private String website;

    public AddProjectRequest() {
    }

    public AddProjectRequest(String githubUrl, String foundation, String website) {
        this.githubUrl = githubUrl;
        this.foundation = foundation;
        this.website = website;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getFoundation() {
        return foundation;
    }

    public void setFoundation(String foundation) {
        this.foundation = foundation;
    }

    public String getWebsite() {
        return website;
    }

    public void setWebsite(String website) {
        this.website = website;
    }
}

// Made with Bob