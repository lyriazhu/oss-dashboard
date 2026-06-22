package com.ossdashboard.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Aggregated metrics for a project
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProjectMetrics {
    private String projectId;
    private String projectName;
    private ProjectMetadata metadata;
    private ContributorData contributors;
    private CommitData commits;
    private IssueData issues;
    private PullRequestData pullRequests;
    private ReleaseData releases;
}

// Made with Bob
