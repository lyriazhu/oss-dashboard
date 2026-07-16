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

    public SettingsService getSettingsService() {
        return settingsService;
    }

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

    /**
     * Derive a data directory name purely from a project ID, without reading projects.json.
     * Format: owner--repo, consistent with org-discovered repos.
     */
    private String deriveDataDir(String projectId) {
        // For projects that already exist in projects.json with a data_dir field,
        // getProjectDirectoryName() returns that value directly and never reaches here.
        // This map covers the initial-add path for known projects so the directory
        // name is predictable even before the first extraction run.
        // Format: owner--repo  (consistent with org-discovered repos).
        switch (projectId) {
            case "strimzi-kafka-operator": return "strimzi--strimzi-kafka-operator";
            case "camel":                  return "apache--camel";
            case "artemis":                return "apache--artemis";
            case "apicurio-studio":
            case "apicurio-registry":      return "apicurio--apicurio-registry";
            case "keycloak":               return "keycloak--keycloak";
            case "debezium":               return "debezium--debezium";
            case "wildfly":                return "wildfly--wildfly";
            case "quarkus":                return "quarkusio--quarkus";
            case "tomcat":                 return "apache--tomcat";
            default: return projectId.toLowerCase().replace("_", "-");
        }
    }

    private String getProjectDirectoryName(String projectId) throws IOException {
        Project project = getProjectById(projectId);
        if (project != null && project.getDataDir() != null && !project.getDataDir().isBlank()) {
            return project.getDataDir();
        }
        // Legacy fallback — covers pre-existing projects that don't yet have data_dir
        return deriveDataDir(projectId);
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
     * Parse a GitHub org/user URL to extract just the owner name.
     * Supports formats:
     * - https://github.com/owner
     * - github.com/owner
     */
    public String parseGithubOrgUrl(String githubUrl) {
        if (githubUrl == null || githubUrl.trim().isEmpty()) {
            return null;
        }
        githubUrl = githubUrl.trim().replaceAll("/$", "");
        Pattern pattern = Pattern.compile("(?:https?://)?(?:www\\.)?github\\.com/([^/]+)$");
        Matcher matcher = pattern.matcher(githubUrl);
        return matcher.find() ? matcher.group(1) : null;
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
        boolean isOrg = Boolean.TRUE.equals(request.getIsOrg());

        String owner;
        String repo;

        if (isOrg) {
            // Org/user-level project — only an owner is required
            owner = parseGithubOrgUrl(request.getGithubUrl());
            if (owner == null) {
                throw new IllegalArgumentException("Invalid GitHub project URL format. Expected: https://github.com/owner");
            }
            repo = null;
        } else {
            // Single-repo project — owner + repo required
            String[] parts = parseGithubUrl(request.getGithubUrl());
            if (parts == null) {
                throw new IllegalArgumentException("Invalid GitHub URL format. Expected: https://github.com/owner/repo");
            }
            owner = parts[0];
            repo = parts[1];
        }

        String[] issueParts = null;
        if (request.getIssueGithubUrl() != null && !request.getIssueGithubUrl().isBlank()
                && !"__all__".equals(request.getIssueGithubUrl().strip())) {
            issueParts = parseGithubUrl(request.getIssueGithubUrl().strip());
            if (issueParts == null) {
                throw new IllegalArgumentException("Invalid issue GitHub URL format. Expected: https://github.com/owner/repo");
            }
        }

        // Project ID: use repo name for single-repo, org name for entire-project
        String idBase = isOrg ? owner : repo;
        String projectId = generateProjectId(idBase);

        // Check if project already exists.
        // For org projects also check config.yaml — _sync_projects_json may have
        // removed the sentinel entry from projects.json, making projectExists() lie.
        if (projectExists(projectId)) {
            throw new IllegalArgumentException("This project has already been added.");
        }
        if (isOrg) {
            Path configPath = Paths.get(dataDirectory).getParent().resolve("scripts/config.yaml");
            if (Files.exists(configPath) && configContainsOrgEntry(configPath, owner)) {
                throw new IllegalArgumentException("This project has already been added.");
            }
        }

        // Create new project
        Project newProject = new Project();
        newProject.setId(projectId);
        newProject.setName(idBase.replaceAll("[-_]", " "));
        newProject.setGithubUrl(request.getGithubUrl());
        newProject.setOwner(owner);
        newProject.setRepo(repo);
        newProject.setIsOrg(isOrg ? true : null);
        newProject.setFoundation(request.getFoundation() != null ? request.getFoundation() : "Independent");
        newProject.setWebsite(request.getWebsite());
        newProject.setEnabled(true);
        // Derive and persist the data directory name so that future renames only
        // need to update this single field.  Uses the same mapping as
        // getProjectDirectoryName so legacy repos (e.g. console → streamshub)
        // are handled correctly on first add.
        newProject.setDataDir(deriveDataDir(projectId));

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
            // Store the raw value (including the "__all__" sentinel)
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
     * Update mutable fields (name, foundation) on a project in projects.json and config.yaml.
     * Returns the updated Project, or null if not found.
     */
    public Project updateProject(String projectId, java.util.Map<String, String> updates) throws IOException {
        Project project = getProjectById(projectId);
        if (project == null) return null;

        String oldName       = project.getName();
        String newName       = updates.getOrDefault("name",       oldName).strip();
        String newFoundation = updates.getOrDefault("foundation", project.getFoundation());
        if (newFoundation != null) newFoundation = newFoundation.strip();

        // 1. Update projects.json — only patch name and foundation; data_dir is never changed
        //    on a rename because it is a filesystem path set at creation time.
        Path projectsFile = Paths.get(dataDirectory, "projects.json");
        JsonNode root = objectMapper.readTree(projectsFile.toFile());
        ArrayNode projectsArray = (ArrayNode) root.get("projects");
        for (int i = 0; i < projectsArray.size(); i++) {
            JsonNode node = projectsArray.get(i);
            if (projectId.equals(node.path("id").asText())) {
                ObjectNode obj = (ObjectNode) node;
                if (!newName.isEmpty()) obj.put("name", newName);
                if (newFoundation != null) obj.put("foundation", newFoundation);
                break;
            }
        }
        ((ObjectNode) root).put("last_updated", Instant.now().toString());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(projectsFile.toFile(), root);
        log.info("Updated project {} in projects.json", projectId);

        // 2. Update config.yaml — patch the name: and foundation: lines inside this project's block
        updateProjectInConfig(oldName, newName, newFoundation);

        // 3. Return the refreshed project
        return getProjectById(projectId);
    }

    /**
     * Update the name: and/or foundation: fields for a project block in config.yaml.
     * Uses the old name to locate the block, then rewrites those specific lines in-place.
     */
    private void updateProjectInConfig(String oldName, String newName, String newFoundation) {
        try {
            Path configPath = Paths.get(dataDirectory).getParent().resolve("scripts/config.yaml");
            if (!Files.exists(configPath)) return;

            List<String> lines = new ArrayList<>(Files.readAllLines(configPath));
            int blockStart = -1;
            int blockEnd   = lines.size();

            // Find the block by old name
            for (int i = 0; i < lines.size(); i++) {
                String trimmed = lines.get(i).trim();
                if (trimmed.equals("- name: \"" + oldName + "\"")
                        || trimmed.equals("- name: " + oldName)) {
                    blockStart = i;
                    for (int j = i + 1; j < lines.size(); j++) {
                        String l = lines.get(j);
                        if (l.startsWith("  - ") || (!l.startsWith(" ") && !l.isEmpty() && !l.startsWith("#"))) {
                            blockEnd = j;
                            break;
                        }
                    }
                    break;
                }
            }

            if (blockStart == -1) {
                log.warn("Could not find '{}' in config.yaml; skipping config update", oldName);
                return;
            }

            for (int i = blockStart; i < blockEnd; i++) {
                String l = lines.get(i);
                String trimmed = l.trim();
                // Update name line
                if (trimmed.startsWith("- name:") && i == blockStart) {
                    lines.set(i, "  - name: \"" + newName + "\"");
                }
                // Update foundation line (keep indentation)
                if (trimmed.startsWith("foundation:") && newFoundation != null) {
                    String indent = l.substring(0, l.indexOf("foundation:"));
                    lines.set(i, indent + "foundation: \"" + newFoundation + "\"");
                }
            }

            Files.writeString(configPath, String.join("\n", lines));
            log.info("Updated '{}' -> '{}' in config.yaml", oldName, newName);
        } catch (Exception e) {
            log.warn("Could not update project in config.yaml: {}", e.getMessage());
        }
    }

    /**
     * Remove a project from projects.json, config.yaml, and its data directory.
     */
    public void removeProject(String projectId) throws IOException {
        // Verify it exists first and capture name + data dir BEFORE modifying projects.json
        Project project = getProjectById(projectId);
        if (project == null) {
            throw new IllegalArgumentException("Project not found: " + projectId);
        }
        String projectName = project.getName();
        // Resolve data directory now, while the project record still exists in projects.json
        Path dataDir = Paths.get(dataDirectory, getProjectDirectoryName(projectId));

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
        removeProjectFromConfig(projectName);

        // 3. Delete the data directory (path resolved before projects.json was modified)
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
     * Remove all blocks matching projectName from config.yaml.
     * Deletes every line from "  - name: ..." up to (not including) the next
     * "  - " entry or a top-level key.  Iterates until no more matches remain
     * so that duplicate entries (e.g. from repeated "Add entire project" clicks
     * before the fix) are also fully cleaned up on the first delete.
     */
    private void removeProjectFromConfig(String projectName) {
        try {
            Path configPath = Paths.get(dataDirectory).getParent().resolve("scripts/config.yaml");
            if (!Files.exists(configPath)) return;

            boolean removedAny = false;
            // Loop until no more matching blocks exist (handles duplicates).
            while (true) {
                List<String> lines = new ArrayList<>(Files.readAllLines(configPath));
                int blockStart = -1;
                int blockEnd   = lines.size();

                for (int i = 0; i < lines.size(); i++) {
                    String trimmed = lines.get(i).trim();
                    // Match quoted or unquoted name, case-insensitively, treating hyphens and spaces as equivalent
                    String nameInLine = null;
                    if (trimmed.startsWith("- name: \"") && trimmed.endsWith("\"")) {
                        nameInLine = trimmed.substring(9, trimmed.length() - 1);
                    } else if (trimmed.startsWith("- name: ")) {
                        nameInLine = trimmed.substring(8);
                    }
                    if (nameInLine != null && normalise(nameInLine).equals(normalise(projectName))) {
                        blockStart = i;
                        // Find where the next list item or top-level key starts
                        for (int j = i + 1; j < lines.size(); j++) {
                            String l = lines.get(j);
                            if (l.startsWith("  - ") || (!l.startsWith(" ") && !l.isEmpty() && !l.startsWith("#"))) {
                                blockEnd = j;
                                break;
                            }
                        }
                        break;
                    }
                }

                if (blockStart == -1) break; // no more blocks found

                List<String> result = new ArrayList<>(lines.subList(0, blockStart));
                result.addAll(lines.subList(blockEnd, lines.size()));
                Files.writeString(configPath, String.join("\n", result));
                removedAny = true;
            }

            if (removedAny) {
                log.info("Removed all blocks for '{}' from config.yaml", projectName);
            } else {
                log.warn("Could not find '{}' in config.yaml; skipping config removal", projectName);
            }
        } catch (Exception e) {
            log.warn("Could not remove project from config.yaml: {}", e.getMessage());
        }
    }

    /** Normalise a project name for fuzzy matching: lowercase, collapse hyphens/spaces. */
    private static String normalise(String s) {
        return s.toLowerCase().replace('-', ' ').replaceAll("\\s+", " ").trim();
    }

    // -------------------------------------------------------------------------
    // Merge persistence — data/merges.json
    // Structure: { "merges": [ { "mergedKey": "...", "memberKeys": [...], "name": "..." } ] }
    // -------------------------------------------------------------------------

    /**
     * Read the current merge map from data/merges.json.
     * Returns an empty list if the file does not exist.
     */
    public List<java.util.Map<String, Object>> getMerges() throws IOException {
        Path mergesFile = Paths.get(dataDirectory, "merges.json");
        if (!Files.exists(mergesFile)) {
            return new ArrayList<>();
        }
        JsonNode root = objectMapper.readTree(mergesFile.toFile());
        JsonNode arr = root.get("merges");
        List<java.util.Map<String, Object>> result = new ArrayList<>();
        if (arr != null && arr.isArray()) {
            for (JsonNode item : arr) {
                java.util.Map<String, Object> entry = new java.util.LinkedHashMap<>();
                entry.put("mergedKey", item.path("mergedKey").asText());
                List<String> memberKeys = new ArrayList<>();
                for (JsonNode k : item.path("memberKeys")) memberKeys.add(k.asText());
                entry.put("memberKeys", memberKeys);
                if (item.has("name")) entry.put("name", item.path("name").asText());
                result.add(entry);
            }
        }
        return result;
    }

    /**
     * Overwrite data/merges.json with the supplied list of merge records.
     * Each record must have: mergedKey (String), memberKeys (List<String>), name (String, optional).
     */
    public void saveMerges(List<java.util.Map<String, Object>> merges) throws IOException {
        Path mergesFile = Paths.get(dataDirectory, "merges.json");
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode arr = objectMapper.createArrayNode();
        for (java.util.Map<String, Object> m : merges) {
            ObjectNode item = objectMapper.createObjectNode();
            item.put("mergedKey", (String) m.get("mergedKey"));
            ArrayNode keys = objectMapper.createArrayNode();
            @SuppressWarnings("unchecked")
            List<String> memberKeys = (List<String>) m.get("memberKeys");
            if (memberKeys != null) memberKeys.forEach(keys::add);
            item.set("memberKeys", keys);
            Object name = m.get("name");
            if (name != null && !name.toString().isBlank()) item.put("name", name.toString());
            arr.add(item);
        }
        root.set("merges", arr);
        root.put("last_updated", Instant.now().toString());
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(mergesFile.toFile(), root);
        log.info("Saved {} merge(s) to merges.json", merges.size());
    }

    /**
     * Returns true if config.yaml already contains an entry whose owner: matches
     * the given owner and (for is_org entries) has is_org: true.
     * Used to prevent duplicate entries from repeated "Add entire project" clicks.
     */
    private boolean configContainsOrgEntry(Path configPath, String owner) {
        try {
            List<String> lines = Files.readAllLines(configPath);
            boolean inBlock = false;
            boolean blockIsOrg = false;
            String blockOwner = null;
            for (String line : lines) {
                String t = line.trim();
                if (t.startsWith("- name:")) {
                    // Evaluate the previous block before starting a new one
                    if (inBlock && blockIsOrg && owner.equalsIgnoreCase(blockOwner)) return true;
                    inBlock = true;
                    blockIsOrg = false;
                    blockOwner = null;
                } else if (inBlock && t.startsWith("owner:")) {
                    blockOwner = t.replaceFirst("owner:\\s*\"?", "").replaceAll("\"$", "").trim();
                } else if (inBlock && t.equals("is_org: true")) {
                    blockIsOrg = true;
                }
            }
            // Check the final block
            if (inBlock && blockIsOrg && owner.equalsIgnoreCase(blockOwner)) return true;
        } catch (Exception e) {
            log.warn("Could not read config.yaml to check for duplicates: {}", e.getMessage());
        }
        return false;
    }

    private void addProjectToConfig(String owner, String repo, Project project, AddProjectRequest request) {
        try {
            Path configPath = Paths.get(dataDirectory).getParent().resolve("scripts/config.yaml");
            if (!Files.exists(configPath)) {
                log.warn("config.yaml not found at {}; skipping config update", configPath);
                return;
            }

            // For org projects, skip if config.yaml already has an entry for this owner.
            // This prevents duplicate blocks when the user clicks "Add entire project"
            // more than once (e.g. after deleting and re-adding).
            if (Boolean.TRUE.equals(project.getIsOrg()) && configContainsOrgEntry(configPath, owner)) {
                log.info("config.yaml already contains an org entry for '{}'; skipping duplicate", owner);
                return;
            }

            // Build the YAML entry for this project
            StringBuilder entry = new StringBuilder("\n");
            entry.append("  - name: \"").append(project.getName()).append("\"\n");
            entry.append("    github_url: \"").append(project.getGithubUrl()).append("\"\n");
            entry.append("    owner: \"").append(owner).append("\"\n");
            if (repo != null) {
                entry.append("    repo: \"").append(repo).append("\"\n");
            }
            if (Boolean.TRUE.equals(project.getIsOrg())) {
                entry.append("    is_org: true\n");
            }
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
                String rawIssueUrl = request.getIssueGithubUrl().strip();
                if ("__all__".equals(rawIssueUrl)) {
                    entry.append("    issue_scope: all\n");
                } else {
                    String[] issueParts = parseGithubUrl(rawIssueUrl);
                    if (issueParts != null) {
                        entry.append("    issue_owner: \"").append(issueParts[0]).append("\"\n");
                        entry.append("    issue_repo: \"").append(issueParts[1]).append("\"\n");
                    }
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
        // For per-repo entries that belong to an org (org_owner is set), pass the
        // org name so config.yaml's is_org entry is found, then add --repo <repoName>
        // so only that one repo is re-extracted instead of the entire org.
        // For ordinary single-repo projects pass the config name as before.
        boolean isOrgRepo = project.getOrgOwner() != null && !project.getOrgOwner().isBlank();
        List<String> command = new java.util.ArrayList<>(java.util.Arrays.asList(
            python3,
            extractScript.toString(),
            isOrgRepo ? project.getOrgOwner() : project.getName()
        ));
        if (isOrgRepo) {
            command.add("--repo");
            command.add(project.getRepo());
        }
        ProcessBuilder processBuilder = new ProcessBuilder(command);
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
