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

    /** "github" (default) or "jira" */
    @JsonProperty("issue_source")
    private String issueSource;

    /**
     * Optional: a different GitHub repo URL to extract issues from.
     * When blank, issues are extracted from the primary github_url repo.
     */
    @JsonProperty("issues_github_url")
    private String issuesGithubUrl;

    @JsonProperty("jira_project_key")
    private String jiraProjectKey;

    @JsonProperty("jira_base_url")
    private String jiraBaseUrl;

    public AddProjectRequest() {}

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String v) { this.githubUrl = v; }

    public String getFoundation() { return foundation; }
    public void setFoundation(String v) { this.foundation = v; }

    public String getWebsite() { return website; }
    public void setWebsite(String v) { this.website = v; }

    public String getIssueSource() { return issueSource; }
    public void setIssueSource(String v) { this.issueSource = v; }

    public String getIssuesGithubUrl() { return issuesGithubUrl; }
    public void setIssuesGithubUrl(String v) { this.issuesGithubUrl = v; }

    public String getJiraProjectKey() { return jiraProjectKey; }
    public void setJiraProjectKey(String v) { this.jiraProjectKey = v; }

    public String getJiraBaseUrl() { return jiraBaseUrl; }
    public void setJiraBaseUrl(String v) { this.jiraBaseUrl = v; }
}

// Made with Bob