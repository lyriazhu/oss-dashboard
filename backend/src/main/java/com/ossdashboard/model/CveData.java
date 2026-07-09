package com.ossdashboard.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * CVE (security vulnerability) data for a project, sourced from
 * the project's GitHub security advisories or the GitHub Advisory Database.
 */
public class CveData {

    public String source;

    @JsonProperty("total_cves")
    public Integer totalCves;

    public List<MonthData> months;

    public List<YearData> years;

    @JsonProperty("extracted_at")
    public String extractedAt;

    public static class MonthData {
        public String month;
        public Integer count;
        public List<CveEntry> cves;
    }

    public static class YearData {
        public String year;
        public Integer count;

        @JsonProperty("is_current")
        public Boolean isCurrent;
    }

    public static class CveEntry {
        public String id;
        public String severity;
        public String summary;
        public String published;
    }
}

// Made with Bob
