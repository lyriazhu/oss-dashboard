package com.ossdashboard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for the merge → refresh → unmerge lifecycle when one of the
 * merged projects uses Jira as its issue source.
 *
 * These tests exercise DataService directly (no Spring context needed) by injecting
 * the two private fields via reflection:
 *   - dataDirectory  (normally bound by @Value)
 *   - settingsService (normally @Autowired)
 *
 * Test scenarios
 * --------------
 * 1. Same-owner merge with a Jira member: consolidation must be skipped entirely
 *    so that jira_project_key / jira_base_url are never destroyed in config.yaml.
 *
 * 2. Same-owner unmerge after consolidation was rightfully skipped: each member's
 *    config.yaml block must be reconstructed with Jira fields intact.
 *
 * 3. Cross-owner merge (GitHub + Jira): config.yaml must not be modified at all.
 *
 * 4. Full round-trip for a same-owner group where NO member uses Jira: consolidation
 *    runs normally, then unmerge restores individual blocks without Jira lines.
 */
class DataServiceMergeJiraTest {

    @TempDir
    Path tempRoot;

    private Path dataDir;
    private Path scriptsDir;
    private Path projectsFile;
    private Path configYaml;
    private Path mergesFile;

    private DataService service;
    private final ObjectMapper mapper = new ObjectMapper();

    // ------------------------------------------------------------------
    // Setup helpers
    // ------------------------------------------------------------------

    @BeforeEach
    void setUp() throws Exception {
        dataDir    = tempRoot.resolve("data");
        scriptsDir = tempRoot.resolve("scripts");
        Files.createDirectories(dataDir);
        Files.createDirectories(scriptsDir);

        projectsFile = dataDir.resolve("projects.json");
        configYaml   = scriptsDir.resolve("config.yaml");
        mergesFile   = dataDir.resolve("merges.json");

        service = new DataService();

        // Inject dataDirectory (points at tempRoot/data)
        Field dataDirField = DataService.class.getDeclaredField("dataDirectory");
        dataDirField.setAccessible(true);
        dataDirField.set(service, dataDir.toString());

        // Inject a minimal SettingsService (token never used in these tests)
        Field ssField = DataService.class.getDeclaredField("settingsService");
        ssField.setAccessible(true);
        ssField.set(service, new SettingsService());
    }

    /** Write a minimal projects.json containing the supplied project objects. */
    private void writeProjects(Object... projects) throws Exception {
        StringBuilder sb = new StringBuilder("{\"projects\":[");
        for (int i = 0; i < projects.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(mapper.writeValueAsString(projects[i]));
        }
        sb.append("]}");
        Files.writeString(projectsFile, sb.toString());
    }

    /** Write a minimal config.yaml with the supplied raw YAML project blocks. */
    private void writeConfig(String... projectBlocks) throws Exception {
        StringBuilder sb = new StringBuilder("projects:\n");
        for (String block : projectBlocks) {
            for (String line : block.split("\n")) {
                sb.append("  ").append(line).append("\n");
            }
        }
        sb.append("\nextraction:\n  quarters_back: 12\n");
        Files.writeString(configYaml, sb.toString());
    }

    private String readConfig() throws Exception {
        return Files.readString(configYaml);
    }

    /** Build a minimal projects.json record map. */
    private Map<String, Object> proj(String id, String name, String owner, String repo,
                                      String issueSource, String jiraKey, String jiraUrl) {
        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("id",         id);
        m.put("name",       name);
        m.put("owner",      owner);
        m.put("repo",       repo);
        m.put("foundation", "Commonhaus Foundation");
        m.put("github_url", "https://github.com/" + owner + "/" + repo);
        m.put("data_dir",   owner.toLowerCase() + "--" + repo.toLowerCase());
        m.put("enabled",    true);
        if (issueSource  != null) m.put("issue_source",     issueSource);
        if (jiraKey      != null) m.put("jira_project_key", jiraKey);
        if (jiraUrl      != null) m.put("jira_base_url",    jiraUrl);
        return m;
    }

    // ------------------------------------------------------------------
    // Test 1 — same-owner merge where one member is Jira: consolidation skipped
    // ------------------------------------------------------------------

    @Test
    void sameOwnerMergeWithJiraMember_consolidationIsSkipped() throws Exception {
        // Two apache repos: tomcat (GitHub issues) + artemis (Jira issues)
        writeProjects(
            proj("apache--tomcat",  "Tomcat",  "apache", "tomcat",  null,   null,   null),
            proj("apache--artemis", "Artemis", "apache", "artemis", "jira", "AMQ",
                 "https://issues.apache.org/jira")
        );
        writeConfig(
            "- name: \"Tomcat\"\n  owner: \"apache\"\n  repo: \"tomcat\"\n  foundation: \"ASF\"",
            "- name: \"Artemis\"\n  owner: \"apache\"\n  repo: \"artemis\"\n  foundation: \"ASF\"\n"
                + "  issue_source: jira\n  jira_project_key: AMQ\n"
                + "  jira_base_url: \"https://issues.apache.org/jira\""
        );

        service.saveMerges(List.of(Map.of(
            "mergedKey",  "__merged__apache--tomcat__apache--artemis",
            "memberKeys", List.of("apache--tomcat", "apache--artemis"),
            "name",       "Apache"
        )));

        String cfg = readConfig();

        // The Artemis Jira block must still be present, unchanged
        assertThat(cfg).contains("issue_source: jira");
        assertThat(cfg).contains("jira_project_key: AMQ");
        assertThat(cfg).contains("jira_base_url:");

        // No is_org: true block should have been written (consolidation was skipped)
        assertThat(cfg).doesNotContain("is_org: true");
    }

    // ------------------------------------------------------------------
    // Test 2 — same-owner unmerge after Jira-guarded consolidation:
    //          individual config blocks must be reconstructed with Jira fields
    // ------------------------------------------------------------------

    @Test
    void sameOwnerUnmerge_jirasFieldsRestoredInConfigYaml() throws Exception {
        // Seed projects.json with Jira fields already stored (as addProject() would write them)
        writeProjects(
            proj("apache--tomcat",  "Tomcat",  "apache", "tomcat",  null,   null,   null),
            proj("apache--artemis", "Artemis", "apache", "artemis", "jira", "AMQ",
                 "https://issues.apache.org/jira")
        );
        // Seed config.yaml with ONLY an is_org block (as if consolidation had run in the past
        // before the guard was introduced) — no per-repo blocks present.
        writeConfig(
            "- name: \"apache\"\n  owner: \"apache\"\n  is_org: true\n  foundation: \"ASF\""
        );
        // Seed merges.json with the existing same-owner merge record
        Files.writeString(mergesFile,
            "{\"merges\":[{\"mergedKey\":\"apache\","
                + "\"memberKeys\":[\"apache--tomcat\",\"apache--artemis\"],\"name\":\"Apache\"}]}"
        );

        // Unmerge: save an empty merges list — this triggers deconsolidateOrgInConfig()
        service.saveMerges(List.of());

        String cfg = readConfig();

        // Both per-repo blocks must be present
        assertThat(cfg).contains("repo: \"tomcat\"");
        assertThat(cfg).contains("repo: \"artemis\"");

        // Jira fields must be restored for artemis
        assertThat(cfg).contains("issue_source: jira");
        assertThat(cfg).contains("jira_project_key: AMQ");
        assertThat(cfg).contains("jira_base_url: \"https://issues.apache.org/jira\"");

        // The is_org: true block must be gone
        assertThat(cfg).doesNotContain("is_org: true");
    }

    // ------------------------------------------------------------------
    // Test 3 — cross-owner merge (GitHub + Jira): config.yaml untouched
    // ------------------------------------------------------------------

    @Test
    void crossOwnerMerge_configYamlIsNotModified() throws Exception {
        writeProjects(
            proj("quarkusio--quarkus", "Quarkus", "quarkusio", "quarkus", null,   null, null),
            proj("wildfly--wildfly",   "Wildfly", "wildfly",   "wildfly", "jira", "WFLY",
                 "https://redhat.atlassian.net/jira/software/c/projects/WFLY/issues")
        );
        writeConfig(
            "- name: \"Quarkus\"\n  owner: \"quarkusio\"\n  repo: \"quarkus\"\n  foundation: \"CF\"",
            "- name: \"Wildfly\"\n  owner: \"wildfly\"\n  repo: \"wildfly\"\n  foundation: \"CF\"\n"
                + "  issue_source: jira\n  jira_project_key: WFLY\n"
                + "  jira_base_url: \"https://redhat.atlassian.net/jira/software/c/projects/WFLY/issues\""
        );
        String cfgBefore = readConfig();

        service.saveMerges(List.of(Map.of(
            "mergedKey",  "__merged__quarkusio--quarkus__wildfly--wildfly",
            "memberKeys", List.of("quarkusio--quarkus", "wildfly--wildfly"),
            "name",       "Quarkus + Wildfly"
        )));

        // config.yaml must be byte-for-byte identical — cross-owner consolidation is always a no-op
        assertThat(readConfig()).isEqualTo(cfgBefore);
    }

    // ------------------------------------------------------------------
    // Test 4 — same-owner merge, all GitHub: consolidation runs + unmerge restores
    // ------------------------------------------------------------------

    @Test
    void sameOwnerMerge_allGitHub_consolidatesAndDeconsolidatesCleanly() throws Exception {
        writeProjects(
            proj("strimzi--strimzi-kafka-operator", "strimzi-kafka-operator",
                 "strimzi", "strimzi-kafka-operator", null, null, null),
            proj("strimzi--strimzi-canary", "strimzi-canary",
                 "strimzi", "strimzi-canary", null, null, null)
        );
        writeConfig(
            "- name: \"strimzi-kafka-operator\"\n  owner: \"strimzi\"\n"
                + "  repo: \"strimzi-kafka-operator\"\n  foundation: \"CNCF\"",
            "- name: \"strimzi-canary\"\n  owner: \"strimzi\"\n"
                + "  repo: \"strimzi-canary\"\n  foundation: \"CNCF\""
        );

        // Merge
        service.saveMerges(List.of(Map.of(
            "mergedKey",  "__merged__strimzi--strimzi-kafka-operator__strimzi--strimzi-canary",
            "memberKeys", List.of("strimzi--strimzi-kafka-operator", "strimzi--strimzi-canary"),
            "name",       "strimzi"
        )));

        String cfgAfterMerge = readConfig();
        // Consolidation should have replaced per-repo blocks with a single is_org: true entry
        assertThat(cfgAfterMerge).contains("is_org: true");
        // No Jira fields should have appeared
        assertThat(cfgAfterMerge).doesNotContain("issue_source");

        // Seed merges.json so deconsolidate can find the old member list
        JsonNode mergesNode = mapper.readTree(mergesFile.toFile());
        assertThat(mergesNode.path("merges").size()).isEqualTo(1);

        // Unmerge
        service.saveMerges(List.of());

        String cfgAfterUnmerge = readConfig();
        assertThat(cfgAfterUnmerge).contains("repo: \"strimzi-kafka-operator\"");
        assertThat(cfgAfterUnmerge).contains("repo: \"strimzi-canary\"");
        assertThat(cfgAfterUnmerge).doesNotContain("is_org: true");
        assertThat(cfgAfterUnmerge).doesNotContain("issue_source");
    }
}
