package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Project model representing an open-source project
 */
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Project {
    private String id;
    private String name;

    @JsonProperty("github_url")
    private String githubUrl;

    private String owner;
    private String repo;
    private String foundation;
    private String website;
    private boolean enabled;

    /** "github" (default) or "jira" */
    @JsonProperty("issue_source")
    private String issueSource;

    @JsonProperty("jira_project_key")
    private String jiraProjectKey;

    @JsonProperty("jira_base_url")
    private String jiraBaseUrl;

    /** Separate GitHub repo used for issue tracking (owner/repo differ from primary) */
    @JsonProperty("issue_github_url")
    private String issueGithubUrl;

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

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGithubUrl() { return githubUrl; }
    public void setGithubUrl(String githubUrl) { this.githubUrl = githubUrl; }

    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }

    public String getRepo() { return repo; }
    public void setRepo(String repo) { this.repo = repo; }

    public String getFoundation() { return foundation; }
    public void setFoundation(String foundation) { this.foundation = foundation; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public String getIssueSource() { return issueSource; }
    public void setIssueSource(String issueSource) { this.issueSource = issueSource; }

    public String getJiraProjectKey() { return jiraProjectKey; }
    public void setJiraProjectKey(String jiraProjectKey) { this.jiraProjectKey = jiraProjectKey; }

    public String getJiraBaseUrl() { return jiraBaseUrl; }
    public void setJiraBaseUrl(String jiraBaseUrl) { this.jiraBaseUrl = jiraBaseUrl; }

    public String getIssueGithubUrl() { return issueGithubUrl; }
    public void setIssueGithubUrl(String issueGithubUrl) { this.issueGithubUrl = issueGithubUrl; }
}

// Made with Bob
