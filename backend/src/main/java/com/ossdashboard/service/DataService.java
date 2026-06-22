package com.ossdashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ossdashboard.model.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * Service to read and process JSON data files
 */
@Service
@Slf4j
public class DataService {

    @Value("${app.data.directory}")
    private String dataDirectory;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Get all projects from projects.json
     */
    public List<Project> getAllProjects() throws IOException {
        Path projectsFile = Paths.get(dataDirectory, "projects.json");
        log.info("Reading projects from: {}", projectsFile.toAbsolutePath());
        
        JsonNode root = objectMapper.readTree(projectsFile.toFile());
        JsonNode projectsNode = root.get("projects");
        
        List<Project> projects = new ArrayList<>();
        if (projectsNode != null && projectsNode.isArray()) {
            for (JsonNode node : projectsNode) {
                Project project = objectMapper.treeToValue(node, Project.class);
                projects.add(project);
            }
        }
        
        return projects;
    }

    /**
     * Get a specific project by ID
     */
    public Project getProjectById(String projectId) throws IOException {
        List<Project> projects = getAllProjects();
        return projects.stream()
                .filter(p -> p.getId().equals(projectId))
                .findFirst()
                .orElse(null);
    }

    /**
     * Get complete metrics for a project
     */
    public ProjectMetrics getProjectMetrics(String projectId) throws IOException {
        Project project = getProjectById(projectId);
        if (project == null) {
            return null;
        }

        String projectName = project.getName().toLowerCase().replace(" ", "-");
        Path projectDir = Paths.get(dataDirectory, projectName);
        
        ProjectMetrics metrics = new ProjectMetrics();
        metrics.setProjectId(projectId);
        metrics.setProjectName(project.getName());
        
        // Load each data file
        metrics.setMetadata(loadJsonFile(projectDir, "metadata.json", ProjectMetadata.class));
        metrics.setContributors(loadJsonFile(projectDir, "contributors.json", ContributorData.class));
        metrics.setCommits(loadJsonFile(projectDir, "commits.json", CommitData.class));
        metrics.setIssues(loadJsonFile(projectDir, "issues.json", IssueData.class));
        metrics.setPullRequests(loadJsonFile(projectDir, "pull_requests.json", PullRequestData.class));
        metrics.setReleases(loadJsonFile(projectDir, "releases.json", ReleaseData.class));
        
        return metrics;
    }

    /**
     * Get metadata for a specific project
     */
    public ProjectMetadata getProjectMetadata(String projectId) throws IOException {
        Project project = getProjectById(projectId);
        if (project == null) {
            return null;
        }

        String projectName = project.getName().toLowerCase().replace(" ", "-");
        Path projectDir = Paths.get(dataDirectory, projectName);
        
        return loadJsonFile(projectDir, "metadata.json", ProjectMetadata.class);
    }

    /**
     * Get contributors for a specific project
     */
    public ContributorData getProjectContributors(String projectId) throws IOException {
        Project project = getProjectById(projectId);
        if (project == null) {
            return null;
        }

        String projectName = project.getName().toLowerCase().replace(" ", "-");
        Path projectDir = Paths.get(dataDirectory, projectName);
        
        return loadJsonFile(projectDir, "contributors.json", ContributorData.class);
    }

    /**
     * Helper method to load JSON file
     */
    private <T> T loadJsonFile(Path directory, String filename, Class<T> valueType) {
        try {
            File file = directory.resolve(filename).toFile();
            if (!file.exists()) {
                log.warn("File not found: {}", file.getAbsolutePath());
                return null;
            }
            return objectMapper.readValue(file, valueType);
        } catch (IOException e) {
            log.error("Error reading file: {}/{}", directory, filename, e);
            return null;
        }
    }
}

// Made with Bob
