package com.ossdashboard.model;

/**
 * Aggregated metrics for a project
 */
public class ProjectMetrics {
    private String projectId;
    private String projectName;
    private ProjectMetadata metadata;
    private ContributorData contributors;
    private CommitData commits;
    private IssueData issues;
    private PullRequestData pullRequests;
    private ReleaseData releases;
    private AdopterData adopters;
    private CveData cves;

    public ProjectMetrics() {
    }

    public ProjectMetrics(String projectId, String projectName, ProjectMetadata metadata,
                         ContributorData contributors, CommitData commits, IssueData issues,
                         PullRequestData pullRequests, ReleaseData releases, AdopterData adopters,
                         CveData cves) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.metadata = metadata;
        this.contributors = contributors;
        this.commits = commits;
        this.issues = issues;
        this.pullRequests = pullRequests;
        this.releases = releases;
        this.adopters = adopters;
        this.cves = cves;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getProjectName() {
        return projectName;
    }

    public void setProjectName(String projectName) {
        this.projectName = projectName;
    }

    public ProjectMetadata getMetadata() {
        return metadata;
    }

    public void setMetadata(ProjectMetadata metadata) {
        this.metadata = metadata;
    }

    public ContributorData getContributors() {
        return contributors;
    }

    public void setContributors(ContributorData contributors) {
        this.contributors = contributors;
    }

    public CommitData getCommits() {
        return commits;
    }

    public void setCommits(CommitData commits) {
        this.commits = commits;
    }

    public IssueData getIssues() {
        return issues;
    }

    public void setIssues(IssueData issues) {
        this.issues = issues;
    }

    public PullRequestData getPullRequests() {
        return pullRequests;
    }

    public void setPullRequests(PullRequestData pullRequests) {
        this.pullRequests = pullRequests;
    }

    public ReleaseData getReleases() {
        return releases;
    }

    public void setReleases(ReleaseData releases) {
        this.releases = releases;
    }

    public AdopterData getAdopters() {
        return adopters;
    }

    public void setAdopters(AdopterData adopters) {
        this.adopters = adopters;
    }

    public CveData getCves() {
        return cves;
    }

    public void setCves(CveData cves) {
        this.cves = cves;
    }
}

// Made with Bob
