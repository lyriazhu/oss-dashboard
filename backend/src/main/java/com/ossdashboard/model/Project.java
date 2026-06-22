package com.ossdashboard.model;

/**
 * Project model representing an open-source project
 */
public class Project {
    private String id;
    private String name;
    
    @com.fasterxml.jackson.annotation.JsonProperty("github_url")
    private String githubUrl;
    
    private String owner;
    private String repo;
    private String foundation;
    private String website;
    private boolean enabled;

    public Project() {
    }

    public Project(String id, String name, String githubUrl, String owner, String repo, 
                   String foundation, String website, boolean enabled) {
        this.id = id;
        this.name = name;
        this.githubUrl = githubUrl;
        this.owner = owner;
        this.repo = repo;
        this.foundation = foundation;
        this.website = website;
        this.enabled = enabled;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGithubUrl() {
        return githubUrl;
    }

    public void setGithubUrl(String githubUrl) {
        this.githubUrl = githubUrl;
    }

    public String getOwner() {
        return owner;
    }

    public void setOwner(String owner) {
        this.owner = owner;
    }

    public String getRepo() {
        return repo;
    }

    public void setRepo(String repo) {
        this.repo = repo;
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

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }
}

// Made with Bob
