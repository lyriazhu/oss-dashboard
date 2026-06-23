package com.ossdashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ossdashboard.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service to read and process JSON data files
 */
@Service
public class DataService {

    private static final Logger log = LoggerFactory.getLogger(DataService.class);

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
            log.error("Error reading file: {}", filename, e);
            return null;
        }
    }

    /**
     * Parse GitHub URL to extract owner and repo
     * Supports formats:
     * - https://github.com/owner/repo
     * - https://github.com/owner/repo.git
     * - github.com/owner/repo
     */
    public String[] parseGithubUrl(String githubUrl) {
        if (githubUrl == null || githubUrl.trim().isEmpty()) {
            return null;
        }

        // Remove trailing .git if present
        githubUrl = githubUrl.replaceAll("\\.git$", "");
        
        // Pattern to match GitHub URLs
        Pattern pattern = Pattern.compile("(?:https?://)?(?:www\\.)?github\\.com/([^/]+)/([^/]+)/?");
        Matcher matcher = pattern.matcher(githubUrl);
        
        if (matcher.find()) {
            String owner = matcher.group(1);
            String repo = matcher.group(2);
            return new String[]{owner, repo};
        }
        
        return null;
    }

    /**
     * Generate a project ID from the repository name
     */
    private String generateProjectId(String repoName) {
        return repoName.toLowerCase().replaceAll("[^a-z0-9-]", "-");
    }

    /**
     * Check if a project with the given ID already exists
     */
    public boolean projectExists(String projectId) throws IOException {
        List<Project> projects = getAllProjects();
        return projects.stream().anyMatch(p -> p.getId().equals(projectId));
    }

    /**
     * Add a new project to projects.json
     */
    public Project addProject(AddProjectRequest request) throws IOException {
        // Parse GitHub URL
        String[] parts = parseGithubUrl(request.getGithubUrl());
        if (parts == null) {
            throw new IllegalArgumentException("Invalid GitHub URL format. Expected: https://github.com/owner/repo");
        }

        String owner = parts[0];
        String repo = parts[1];
        String projectId = generateProjectId(repo);

        // Check if project already exists
        if (projectExists(projectId)) {
            throw new IllegalArgumentException("Project with ID '" + projectId + "' already exists");
        }

        // Create new project
        Project newProject = new Project();
        newProject.setId(projectId);
        newProject.setName(repo.replaceAll("-", " ").replaceAll("_", " "));
        newProject.setGithubUrl(request.getGithubUrl());
        newProject.setOwner(owner);
        newProject.setRepo(repo);
        newProject.setFoundation(request.getFoundation() != null ? request.getFoundation() : "Independent");
        newProject.setWebsite(request.getWebsite());
        newProject.setEnabled(true);

        // Read existing projects.json
        Path projectsFile = Paths.get(dataDirectory, "projects.json");
        JsonNode root = objectMapper.readTree(projectsFile.toFile());
        
        // Add new project to the array
        ArrayNode projectsArray = (ArrayNode) root.get("projects");
        ObjectNode newProjectNode = objectMapper.valueToTree(newProject);
        projectsArray.add(newProjectNode);

        // Update last_updated timestamp
        ((ObjectNode) root).put("last_updated", Instant.now().toString());

        // Write back to file
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(projectsFile.toFile(), root);

        log.info("Added new project: {} ({})", newProject.getName(), projectId);
        return newProject;
    }

    /**
     * Trigger data extraction for a specific project
     */
    public void triggerDataExtraction(String projectId) throws IOException, InterruptedException {
        Project project = getProjectById(projectId);
        if (project == null) {
            throw new IllegalArgumentException("Project not found: " + projectId);
        }

        // Get the scripts directory path
        Path scriptsDir = Paths.get(dataDirectory).getParent().resolve("scripts");
        Path extractScript = scriptsDir.resolve("extract_single_project.py");

        if (!Files.exists(extractScript)) {
            throw new IOException("Data extraction script not found: " + extractScript);
        }

        // Build the command to run the Python script for a single project
        ProcessBuilder processBuilder = new ProcessBuilder(
            "python3",
            extractScript.toString(),
            projectId  // Pass the project ID as argument
        );
        processBuilder.directory(scriptsDir.toFile());
        processBuilder.redirectErrorStream(true);

        log.info("Starting data extraction for project: {} ({})", project.getName(), projectId);
        
        // Start the process asynchronously in a separate thread
        new Thread(() -> {
            try {
                Process process = processBuilder.start();
                int exitCode = process.waitFor();
                if (exitCode == 0) {
                    log.info("Data extraction completed successfully for project: {}", projectId);
                } else {
                    log.error("Data extraction failed for project: {} with exit code: {}", projectId, exitCode);
                }
            } catch (Exception e) {
                log.error("Error during data extraction for project: {}", projectId, e);
            }
        }).start();
        
        log.info("Data extraction process started in background for project: {}", projectId);
    }
}

// Made with Bob
