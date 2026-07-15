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

    @JsonProperty("jira_project_key")
    private String jiraProjectKey;

    @JsonProperty("jira_base_url")
    private String jiraBaseUrl;

    @JsonProperty("issue_github_url")
    private String issueGithubUrl;

    /** true when the github_url points to an org/user rather than a single repo */
    @JsonProperty("is_org")
    private Boolean isOrg;

    public AddProjectRequest() {}

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String v) { this.githubUrl = v; }

    public String getFoundation() { return foundation; }
    public void setFoundation(String v) { this.foundation = v; }

    public String getWebsite() { return website; }
    public void setWebsite(String v) { this.website = v; }

    public String getIssueSource() { return issueSource; }
    public void setIssueSource(String v) { this.issueSource = v; }

    public String getJiraProjectKey() { return jiraProjectKey; }
    public void setJiraProjectKey(String v) { this.jiraProjectKey = v; }

    public String getJiraBaseUrl() { return jiraBaseUrl; }
    public void setJiraBaseUrl(String v) { this.jiraBaseUrl = v; }

    public String getIssueGithubUrl() { return issueGithubUrl; }
    public void setIssueGithubUrl(String v) { this.issueGithubUrl = v; }

    public Boolean getIsOrg() { return isOrg; }
    public void setIsOrg(Boolean v) { this.isOrg = v; }
}

// Made with Bob