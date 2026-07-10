package com.ossdashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.ossdashboard.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
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

    @Autowired
    private SettingsService settingsService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // projectId -> live log lines from the running extraction process
    private final ConcurrentHashMap<String, CopyOnWriteArrayList<String>> extractionLogs =
        new ConcurrentHashMap<>();
    // projectId -> whether extraction is still running
    private final ConcurrentHashMap<String, Boolean> extractionRunning =
        new ConcurrentHashMap<>();

    public List<String> getExtractionLogs(String projectId) {
        return extractionLogs.getOrDefault(projectId, new CopyOnWriteArrayList<>());
    }

    public boolean isExtractionRunning(String projectId) {
        return extractionRunning.getOrDefault(projectId, false);
    }

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

        Path projectDir = Paths.get(dataDirectory, getProjectDirectoryName(projectId));
        log.info("Looking for project data in directory: {}", projectDir.toAbsolutePath());
        
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
        metrics.setAdopters(loadJsonFile(projectDir, "adopters.json", AdopterData.class));
        metrics.setCves(loadJsonFile(projectDir, "cve.json", CveData.class));
        
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

        Path projectDir = Paths.get(dataDirectory, getProjectDirectoryName(projectId));
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

        Path projectDir = Paths.get(dataDirectory, getProjectDirectoryName(projectId));
        return loadJsonFile(projectDir, "contributors.json", ContributorData.class);
    }

    private String getProjectDirectoryName(String projectId) {
        switch (projectId) {
            case "strimzi-kafka-operator":
                return "strimzi";
            case "camel":
                return "apache-camel";
            case "artemis":
                return "apache-artemis";
            case "apicurio-studio":
            case "apicurio-registry":
                return "apicurio";
            case "3scale-operator":
                return "3scale";
            case "console":
                return "streamshub";
            default:
                return projectId.toLowerCase().replace("_", "-");
        }
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

        String[] issueParts = null;
        if (request.getIssueGithubUrl() != null && !request.getIssueGithubUrl().isBlank()) {
            issueParts = parseGithubUrl(request.getIssueGithubUrl().strip());
            if (issueParts == null) {
                throw new IllegalArgumentException("Invalid issue GitHub URL format. Expected: https://github.com/owner/repo");
            }
        }

        String owner = parts[0];
        String repo = parts[1];
        String projectId = generateProjectId(repo);

        // Check if project already exists
        if (projectExists(projectId)) {
            throw new IllegalArgumentException("This project has already been added.");
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

        // Persist issue-tracker configuration so it survives backend restarts
        if ("jira".equalsIgnoreCase(request.getIssueSource())) {
            newProject.setIssueSource("jira");
            if (request.getJiraProjectKey() != null && !request.getJiraProjectKey().isBlank()) {
                newProject.setJiraProjectKey(request.getJiraProjectKey().strip());
            }
            if (request.getJiraBaseUrl() != null && !request.getJiraBaseUrl().isBlank()) {
                newProject.setJiraBaseUrl(request.getJiraBaseUrl().strip());
            }
        } else if (request.getIssueGithubUrl() != null && !request.getIssueGithubUrl().isBlank()) {
            newProject.setIssueGithubUrl(request.getIssueGithubUrl().strip());
        }

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

        // Also append to config.yaml so extract_single_project.py can find it
        addProjectToConfig(owner, repo, newProject, request);

        return newProject;
    }

    /**
     * Remove a project from projects.json, config.yaml, and its data directory.
     */
    public void removeProject(String projectId) throws IOException {
        // Verify it exists first
        if (!projectExists(projectId)) {
            throw new IllegalArgumentException("Project not found: " + projectId);
        }

        // 1. Remove from projects.json
        Path projectsFile = Paths.get(dataDirectory, "projects.json");
        JsonNode root = objectMapper.readTree(projectsFile.toFile());
        ArrayNode projectsArray = (ArrayNode) root.get("projects");
        for (int i = 0; i < projectsArray.size(); i++) {
            if (projectId.equals(projectsArray.get(i).path("id").asText())) {
                projectsArray.remove(i);
                break;
            }
        }
        ((ObjectNode) root).put("last_updated", Instant.now().toString());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(projectsFile.toFile(), root);
        log.info("Removed {} from projects.json", projectId);

        // 2. Remove from config.yaml (delete the project's block)
        removeProjectFromConfig(projectId);

        // 3. Delete the data directory
        Path dataDir = Paths.get(dataDirectory, getProjectDirectoryName(projectId));
        if (Files.exists(dataDir)) {
            try (var stream = Files.walk(dataDir)) {
                stream.sorted(java.util.Comparator.reverseOrder())
                      .map(java.nio.file.Path::toFile)
                      .forEach(java.io.File::delete);
            }
            log.info("Deleted data directory: {}", dataDir);
        }
    }

    /**
     * Remove a project's YAML block from config.yaml.
     * Deletes every line from "  - name: ..." up to (not including) the next
     * "  - " entry or a top-level key.
     */
    private void removeProjectFromConfig(String projectId) {
        try {
            Path configPath = Paths.get(dataDirectory).getParent().resolve("scripts/config.yaml");
            if (!Files.exists(configPath)) return;

            // Resolve the project name from projects.json to match the config name field
            Project project = getProjectById(projectId);
            String projectName = project != null ? project.getName() : null;

            List<String> lines = new ArrayList<>(Files.readAllLines(configPath));
            int blockStart = -1;
            int blockEnd   = lines.size();

            for (int i = 0; i < lines.size(); i++) {
                String trimmed = lines.get(i).trim();
                // Match "- name: "projectName"" or "- name: projectName"
                if (trimmed.equals("- name: \"" + projectName + "\"")
                        || trimmed.equals("- name: " + projectName)) {
                    blockStart = i;
                    // Find where the next list item or top-level key starts
                    for (int j = i + 1; j < lines.size(); j++) {
                        String l = lines.get(j);
                        if ((l.startsWith("  - ") || (!l.startsWith(" ") && !l.isEmpty() && !l.startsWith("#")))) {
                            blockEnd = j;
                            break;
                        }
                    }
                    break;
                }
            }

            if (blockStart == -1) {
                log.warn("Could not find {} in config.yaml; skipping config removal", projectName);
                return;
            }

            List<String> result = new ArrayList<>(lines.subList(0, blockStart));
            result.addAll(lines.subList(blockEnd, lines.size()));
            Files.writeString(configPath, String.join("\n", result));
            log.info("Removed {} from config.yaml", projectName);
        } catch (Exception e) {
            log.warn("Could not remove project from config.yaml: {}", e.getMessage());
        }
    }

    /**
     * Append a new project entry to scripts/config.yaml so the Python
     * extraction scripts can discover it by name or owner/repo.
     */
    private void addProjectToConfig(String owner, String repo, Project project, AddProjectRequest request) {
        try {
            Path configPath = Paths.get(dataDirectory).getParent().resolve("scripts/config.yaml");
            if (!Files.exists(configPath)) {
                log.warn("config.yaml not found at {}; skipping config update", configPath);
                return;
            }

            // Build the YAML entry for this project
            StringBuilder entry = new StringBuilder("\n");
            entry.append("  - name: \"").append(project.getName()).append("\"\n");
            entry.append("    github_url: \"").append(project.getGithubUrl()).append("\"\n");
            entry.append("    owner: \"").append(owner).append("\"\n");
            entry.append("    repo: \"").append(repo).append("\"\n");
            if (project.getFoundation() != null && !project.getFoundation().isBlank()) {
                entry.append("    foundation: \"").append(project.getFoundation()).append("\"\n");
            }
            if (project.getWebsite() != null && !project.getWebsite().isBlank()) {
                entry.append("    website: \"").append(project.getWebsite()).append("\"\n");
            }
            // Issue source fields
            String issueSource = request.getIssueSource();
            if ("jira".equalsIgnoreCase(issueSource)) {
                entry.append("    issue_source: jira\n");
                if (request.getJiraProjectKey() != null && !request.getJiraProjectKey().isBlank()) {
                    entry.append("    jira_project_key: ").append(request.getJiraProjectKey().strip()).append("\n");
                }
                if (request.getJiraBaseUrl() != null && !request.getJiraBaseUrl().isBlank()) {
                    entry.append("    jira_base_url: \"").append(request.getJiraBaseUrl().strip()).append("\"\n");
                }
            } else if (request.getIssueGithubUrl() != null && !request.getIssueGithubUrl().isBlank()) {
                String[] issueParts = parseGithubUrl(request.getIssueGithubUrl().strip());
                if (issueParts != null) {
                    entry.append("    issue_owner: \"").append(issueParts[0]).append("\"\n");
                    entry.append("    issue_repo: \"").append(issueParts[1]).append("\"\n");
                }
            }

            // Insert before the first top-level key that follows the projects list
            // (e.g. "extraction:", a blank comment line, or "# Made with Bob").
            // This keeps the entry inside the projects: sequence.
            List<String> lines = new ArrayList<>(Files.readAllLines(configPath));
            int insertAt = lines.size(); // default: end of file
            boolean inProjects = false;
            for (int i = 0; i < lines.size(); i++) {
                String l = lines.get(i);
                if (l.startsWith("projects:")) { inProjects = true; continue; }
                if (inProjects && !l.startsWith(" ") && !l.startsWith("\t") && !l.isEmpty()) {
                    // First non-indented, non-blank line after projects: — insert here
                    insertAt = i;
                    break;
                }
            }

            // Build the final file content with the entry spliced in
            List<String> result = new ArrayList<>(lines.subList(0, insertAt));
            // entry starts with \n; split into individual lines to add cleanly
            for (String el : entry.toString().split("\n", -1)) {
                result.add(el);
            }
            result.addAll(lines.subList(insertAt, lines.size()));
            Files.writeString(configPath, String.join("\n", result));
            log.info("Added project {} to config.yaml", project.getName());
        } catch (Exception e) {
            // Non-fatal: the project was written to projects.json; extraction can be retried manually
            log.warn("Could not update config.yaml for project {}: {}", project.getName(), e.getMessage());
        }
    }

    /**
     * Returns the absolute path of python3, falling back to common fixed locations
     * so the command works even when the Java process runs with a minimal PATH.
     */
    private String resolvePython3() {
        // First try resolving via `which python3` so we honour any active venv or pyenv
        for (String candidate : new String[]{"python3", "/usr/bin/python3", "/usr/local/bin/python3"}) {
            try {
                ProcessBuilder pb = new ProcessBuilder("which", candidate.startsWith("/") ? candidate : "python3");
                pb.redirectErrorStream(true);
                Process p = pb.start();
                String found = new String(p.getInputStream().readAllBytes()).strip();
                p.waitFor();
                if (!found.isEmpty() && java.nio.file.Files.isExecutable(java.nio.file.Paths.get(found))) {
                    return found;
                }
            } catch (Exception ignored) {}
            // If the candidate is already an absolute path, check it directly
            if (candidate.startsWith("/") && java.nio.file.Files.isExecutable(java.nio.file.Paths.get(candidate))) {
                return candidate;
            }
        }
        return "python3"; // last resort — rely on whatever PATH the process has
    }

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

        // Resolve python3 to its absolute path so it works regardless of the
        // PATH visible to the Java process (e.g. when launched as a service).
        String python3 = resolvePython3();

        // Build the command to run the Python script for a single project.
        // Pass the project's config name (matches p['name'] in config.yaml) rather
        // than the project ID, which may differ for hyphenated repo names.
        ProcessBuilder processBuilder = new ProcessBuilder(
            python3,
            extractScript.toString(),
            project.getName()
        );
        processBuilder.directory(scriptsDir.toFile());
        processBuilder.redirectErrorStream(true);
        // Forward GITHUB_TOKEN so the Python script can authenticate with the GitHub API
        String githubToken = settingsService.getGithubToken();
        if (githubToken == null) {
            throw new IllegalStateException("No GitHub token configured. Set one via the dashboard settings.");
        }
        processBuilder.environment().put("GITHUB_TOKEN", githubToken);

        log.info("Starting data extraction for project: {} ({})", project.getName(), projectId);

        // Initialise log buffer and mark as running
        CopyOnWriteArrayList<String> logLines = new CopyOnWriteArrayList<>();
        extractionLogs.put(projectId, logLines);
        extractionRunning.put(projectId, true);

        // Start the process asynchronously in a separate thread
        new Thread(() -> {
            try {
                Process process = processBuilder.start();
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        logLines.add(line);
                        log.debug("[extraction {}] {}", projectId, line);
                    }
                }
                int exitCode = process.waitFor();
                if (exitCode == 0) {
                    log.info("Data extraction completed successfully for project: {}", projectId);
                    // Also run CVE extraction for this project now that its data directory exists
                    runCveExtraction(project.getName(), projectId, logLines, scriptsDir);
                } else {
                    log.error("Data extraction failed for project: {} with exit code: {}", projectId, exitCode);
                    logLines.add("__FAILED__");
                }
            } catch (Exception e) {
                logLines.add("__FAILED__");
                log.error("Error during data extraction for project: {}", projectId, e);
            } finally {
                extractionRunning.put(projectId, false);
            }
        }).start();

        log.info("Data extraction process started in background for project: {}", projectId);
    }

    /**
     * Run extract_cves.py for a single project (by name) and append its output
     * to the shared log buffer.  Emits __DONE__ or __FAILED__ when finished.
     */
    private void runCveExtraction(String projectName, String projectId,
                                   CopyOnWriteArrayList<String> logLines, Path scriptsDir) {
        Path cveScript = scriptsDir.resolve("extract_cves.py");
        if (!Files.exists(cveScript)) {
            log.warn("extract_cves.py not found at {}; skipping CVE extraction", cveScript);
            logLines.add("__DONE__");
            return;
        }
        String python3 = resolvePython3();
        ProcessBuilder pb = new ProcessBuilder(python3, cveScript.toString(), projectName);
        pb.directory(scriptsDir.toFile());
        pb.redirectErrorStream(true);
        try {
            log.info("Starting CVE extraction for project: {}", projectId);
            logLines.add("[CVE extraction]");
            Process process = pb.start();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    logLines.add(line);
                    log.debug("[cve {}] {}", projectId, line);
                }
            }
            int exitCode = process.waitFor();
            if (exitCode == 0) {
                log.info("CVE extraction completed successfully for project: {}", projectId);
            } else {
                log.error("CVE extraction failed for project: {} with exit code: {}", projectId, exitCode);
            }
        } catch (Exception e) {
            log.error("Error during CVE extraction for project: {}", projectId, e);
        }
        logLines.add("__DONE__");
    }
}

// Made with Bob
